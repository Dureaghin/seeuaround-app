import { query, withTransaction } from "./db.js";
import { morningAfter } from "./pause-until.js";
import { queueNotification } from "./push.js";
import { todayYmd } from "./week.js";

type MemberRow = { id: string; first_name: string };

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function asIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    const inner = value.replace(/^\{|\}$/g, "");
    return inner.length === 0 ? [] : inner.split(",");
  }
  return [];
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((id) => other.has(id));
}

function isSubset(small: string[], big: string[]): boolean {
  const other = new Set(big);
  return small.every((id) => other.has(id));
}

/** Maximal cliques of size 2 or more. Friends who are not connected stay in separate overlaps. */
function maximalCliques(ids: string[], linked: Set<string>): string[][] {
  const neighbors = new Map<string, Set<string>>();
  for (const id of ids) neighbors.set(id, new Set());
  for (const a of ids) {
    for (const b of ids) {
      if (a < b && linked.has(pairKey(a, b))) {
        neighbors.get(a)!.add(b);
        neighbors.get(b)!.add(a);
      }
    }
  }

  const cliques: string[][] = [];
  const bron = (r: string[], p: string[], x: string[]) => {
    if (p.length === 0 && x.length === 0) {
      if (r.length >= 2) cliques.push(r);
      return;
    }
    const pivot = p[0] ?? x[0];
    const pivotNeighbors = pivot ? neighbors.get(pivot)! : new Set<string>();
    const candidates = p.filter((id) => !pivotNeighbors.has(id));
    let remaining = p;
    let excluded = x;
    for (const v of candidates) {
      const adjacent = neighbors.get(v)!;
      bron(
        [...r, v],
        remaining.filter((id) => adjacent.has(id)),
        excluded.filter((id) => adjacent.has(id)),
      );
      remaining = remaining.filter((id) => id !== v);
      excluded = [...excluded, v];
    }
  };
  bron([], [...ids], []);
  return cliques;
}

function weekdayName(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "long" });
}

function overlapBody(otherNames: string[]): string {
  const names = otherNames.filter((name) => name.trim().length > 0);
  if (names.length === 0) return "You and your people are all free.";
  if (names.length === 1) return `You and ${names[0]} are all free.`;
  const head = names.slice(0, -1).join(", ");
  return `You, ${head} and ${names[names.length - 1]} are all free.`;
}

async function createOverlap(
  night: string,
  members: MemberRow[],
  timezone: string,
): Promise<void> {
  const memberIds = members.map((member) => member.id).sort();
  const expiresAt = morningAfter(night, timezone);
  const spanStart = `${night}T18:00:00.000Z`;
  const spanEnd = `${night}T23:59:59.000Z`;

  const createdId = await withTransaction(async (client) => {
    const { rows: existing } = await client.query<{
      id: string;
      members: string[];
      answered: boolean;
      has_thread: boolean;
    }>(
      `SELECT o.id,
              array_agg(om.user_id::text ORDER BY om.user_id) AS members,
              bool_or(om.response IS NOT NULL) AS answered,
              EXISTS (SELECT 1 FROM threads t WHERE t.overlap_id = o.id) AS has_thread
       FROM "overlaps" o
       JOIN overlap_members om ON om.overlap_id = o.id
       WHERE o.night_date = $1::date AND o.expires_at > now()
       GROUP BY o.id`,
      [night],
    );

    for (const row of existing) {
      const members = asIds(row.members);
      if (sameMembers(members, memberIds)) return null;
      if (isSubset(memberIds, members)) return null;
    }

    for (const row of existing) {
      const members = asIds(row.members);
      if (isSubset(members, memberIds) && !row.answered && !row.has_thread) {
        await client.query(`DELETE FROM "overlaps" WHERE id = $1`, [row.id]);
      }
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO "overlaps" (span, night_date, expires_at)
       VALUES (tstzrange($1, $2), $3::date, $4)
       RETURNING id`,
      [spanStart, spanEnd, night, expiresAt.toISOString()],
    );
    const overlapId = inserted.rows[0]?.id;
    if (!overlapId) return null;

    for (const memberId of memberIds) {
      await client.query(
        `INSERT INTO overlap_members (overlap_id, user_id) VALUES ($1, $2)`,
        [overlapId, memberId],
      );
    }
    return overlapId;
  });

  if (!createdId) return;

  const weekday = weekdayName(night);
  for (const member of members) {
    const others = members
      .filter((person) => person.id !== member.id)
      .map((person) => person.first_name.trim() || "Someone")
      .sort((a, b) => a.localeCompare(b));
    await queueNotification({
      userId: member.id,
      kind: "overlap",
      title: weekday,
      body: overlapBody(others),
      data: { route: "overlap", overlapId: createdId },
    });
  }
}

export async function runMatchingForUser(userId: string): Promise<void> {
  const { rows: userRows } = await query<{
    paused: boolean;
    pause_until: Date | null;
    timezone: string;
    first_name: string;
  }>(
    `SELECT paused, pause_until, timezone, first_name FROM users WHERE id = $1`,
    [userId],
  );
  const user = userRows[0];
  if (!user) return;
  if (user.paused && (!user.pause_until || user.pause_until.getTime() > Date.now())) return;

  const today = todayYmd();
  const { rows: nightRows } = await query<{ date: string }>(
    `SELECT DISTINCT to_char(lower(span) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date
     FROM windows
     WHERE user_id = $1
       AND to_char(lower(span) AT TIME ZONE 'UTC', 'YYYY-MM-DD') >= $2
     ORDER BY 1`,
    [userId, today],
  );
  if (nightRows.length === 0) return;

  const { rows: friendRows } = await query<MemberRow>(
    `SELECT u.id, u.first_name
     FROM connections c
     JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
     WHERE c.status = 'accepted'
       AND (c.user_a = $1 OR c.user_b = $1)
       AND NOT (u.paused AND (u.pause_until IS NULL OR u.pause_until > now()))`,
    [userId],
  );
  if (friendRows.length === 0) return;

  const friendIds = friendRows.map((friend) => friend.id);
  const { rows: edgeRows } = await query<{ user_a: string; user_b: string }>(
    `SELECT user_a::text, user_b::text
     FROM connections
     WHERE status = 'accepted'
       AND user_a = ANY($1::uuid[])
       AND user_b = ANY($1::uuid[])`,
    [[userId, ...friendIds]],
  );
  const linked = new Set(edgeRows.map((edge) => pairKey(edge.user_a, edge.user_b)));

  const names = new Map<string, string>([
    [userId, user.first_name],
    ...friendRows.map((friend) => [friend.id, friend.first_name] as const),
  ]);

  for (const night of nightRows) {
    const { rows: freeRows } = await query<{ user_id: string }>(
      `SELECT DISTINCT b.user_id::text
       FROM windows a
       JOIN windows b
         ON b.user_id = ANY($2::uuid[])
        AND b.span && a.span
        AND upper(a.span * b.span) - lower(a.span * b.span) >= interval '90 minutes'
       WHERE a.user_id = $1
         AND to_char(lower(a.span) AT TIME ZONE 'UTC', 'YYYY-MM-DD') = $3`,
      [userId, friendIds, night.date],
    );
    const freeIds = [userId, ...freeRows.map((row) => row.user_id)];
    if (freeIds.length < 2) continue;

    const cliques = maximalCliques(freeIds, linked).filter((clique) => clique.includes(userId));
    for (const clique of cliques) {
      const members = clique.map((id) => ({ id, first_name: names.get(id) ?? "" }));
      await createOverlap(night.date, members, user.timezone || "America/New_York");
    }
  }
}

export async function runMatchingSweep(): Promise<void> {
  const today = todayYmd();
  const { rows } = await query<{ id: string }>(
    `SELECT DISTINCT w.user_id AS id
     FROM windows w
     JOIN users u ON u.id = w.user_id
     WHERE to_char(lower(w.span) AT TIME ZONE 'UTC', 'YYYY-MM-DD') >= $1
       AND NOT (u.paused AND (u.pause_until IS NULL OR u.pause_until > now()))
     LIMIT 200`,
    [today],
  );
  for (const row of rows) {
    await runMatchingForUser(row.id);
  }
}
