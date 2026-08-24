import type { MeState } from "@seeuaround/shared";
import { query } from "./db.js";
import type { AuthedUser } from "./auth-middleware.js";

function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date = new Date()): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export async function buildMeState(user: AuthedUser): Promise<MeState> {
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();

  const [{ rows: connRows }, { rows: weekRows }, { rows: overlapRows }, { rows: threadRows }, { rows: hangoutRows }] =
    await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM connections
         WHERE status = 'accepted' AND (user_a = $1 OR user_b = $1)`,
        [user.id],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM windows
         WHERE user_id = $1 AND span && tstzrange($2, $3)`,
        [user.id, weekStart.toISOString(), weekEnd.toISOString()],
      ),
      query<{ id: string }>(
        `SELECT o.id FROM overlaps o
         JOIN overlap_members om ON om.overlap_id = o.id AND om.user_id = $1
         WHERE om.response IS NULL AND o.expires_at > now()
         ORDER BY o.created_at ASC LIMIT 1`,
        [user.id],
      ),
      query<{ id: string }>(
        `SELECT t.id FROM threads t
         JOIN overlap_members om ON om.overlap_id = t.overlap_id AND om.user_id = $1
         WHERE om.response = 'in'
           AND t.expires_at > now()
           AND lower((SELECT span FROM overlaps WHERE id = t.overlap_id)) <= now() + interval '1 day'
         ORDER BY t.expires_at ASC LIMIT 1`,
        [user.id],
      ),
      query<{ overlap_id: string; night_date: string }>(
        `SELECT hc.overlap_id, hc.night_date::text
         FROM hangout_checks hc
         WHERE hc.user_id = $1 AND hc.response IS NULL
           AND hc.night_date = (CURRENT_DATE - interval '1 day')::date
         LIMIT 1`,
        [user.id],
      ),
    ]);

  const connectionCount = Number(connRows[0]?.count ?? 0);
  const weekSet = Number(weekRows[0]?.count ?? 0) > 0;
  const unansweredOverlapId = overlapRows[0]?.id ?? null;
  const activeThreadId = threadRows[0]?.id ?? null;

  let route: MeState["route"] = "people";
  const routeParams: Record<string, string> = {};

  if (!user.ageVerified) {
    route = "age";
  } else if (connectionCount < 5) {
    route = "invite";
  } else if (unansweredOverlapId) {
    route = "overlap";
    routeParams.id = unansweredOverlapId;
  } else if (activeThreadId) {
    route = "thread";
    routeParams.id = activeThreadId;
  } else if (!weekSet) {
    route = "sunday";
  } else if (user.paused) {
    route = "pause";
  }

  const hangout = hangoutRows[0];
  const pendingHangoutCheck = hangout
    ? {
        overlapId: hangout.overlap_id,
        label: `Did ${new Date(hangout.night_date).toLocaleDateString("en-US", { weekday: "long" })} happen?`,
      }
    : null;

  return {
    route,
    routeParams: Object.keys(routeParams).length ? routeParams : undefined,
    user: {
      id: user.id,
      handle: user.handle,
      shortCode: user.shortCode,
      firstName: user.firstName,
      ageVerified: user.ageVerified,
      paused: user.paused,
      timezone: user.timezone,
    },
    connectionCount,
    weekSet,
    unansweredOverlapId,
    activeThreadId,
    pendingHangoutCheck,
  };
}

export async function runMatchingForUser(userId: string) {
  const { rows: friends } = await query<{ friend_id: string }>(
    `SELECT CASE WHEN user_a = $1 THEN user_b ELSE user_a END AS friend_id
     FROM connections WHERE status = 'accepted' AND (user_a = $1 OR user_b = $1)`,
    [userId],
  );
  if (friends.length === 0) return;

  const friendIds = friends.map((f) => f.friend_id);
  const { rows: matches } = await query<{
    friend_id: string;
    shared_start: string;
    shared_end: string;
    night_date: string;
  }>(
    `SELECT
       b.user_id AS friend_id,
       lower(a.span * b.span) AS shared_start,
       upper(a.span * b.span) AS shared_end,
       (lower(a.span * b.span) AT TIME ZONE 'UTC')::date AS night_date
     FROM windows a
     JOIN windows b ON b.user_id = ANY($2::uuid[])
       AND b.span && a.span
     WHERE a.user_id = $1
       AND upper(a.span * b.span) - lower(a.span * b.span) >= interval '90 minutes'
       AND lower(a.span) > now()`,
    [userId, friendIds],
  );

  for (const match of matches) {
    const memberIds = [userId, match.friend_id].sort();
    const { rows: existing } = await query<{ id: string }>(
      `SELECT o.id FROM overlaps o
       JOIN overlap_members om ON om.overlap_id = o.id
       WHERE o.night_date = $1::date
       GROUP BY o.id
       HAVING array_agg(om.user_id ORDER BY om.user_id) = $2::uuid[]`,
      [match.night_date, memberIds],
    );
    if (existing[0]) continue;

    const spanStart = match.shared_start;
    const spanEnd = match.shared_end;
    const expiresAt = new Date(spanEnd);
    expiresAt.setDate(expiresAt.getDate() + 1);

    const { rows: overlapRows } = await query<{ id: string }>(
      `INSERT INTO overlaps (span, night_date, expires_at)
       VALUES (tstzrange($1, $2), $3::date, $4)
       RETURNING id`,
      [spanStart, spanEnd, match.night_date, expiresAt.toISOString()],
    );
    const overlapId = overlapRows[0].id;

    for (const memberId of memberIds) {
      await query(
        `INSERT INTO overlap_members (overlap_id, user_id) VALUES ($1, $2)`,
        [overlapId, memberId],
      );
    }

    await query(
      `INSERT INTO notifications (user_id, kind, title, body, data)
       SELECT u.id, 'overlap', 'You overlap tonight',
         to_char($2::date, 'FMDay') || '. You and a friend are both free.',
         jsonb_build_object('overlapId', $1::text, 'route', 'overlap')
       FROM users u WHERE u.id = ANY($3::uuid[])`,
      [overlapId, match.night_date, memberIds],
    );
  }
}
