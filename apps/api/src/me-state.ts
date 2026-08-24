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

  const [
    { rows: connRows },
    { rows: weekRows },
    { rows: overlapRows },
    { rows: threadRows },
    { rows: hangoutRows },
    { rows: pendingRows },
    { rows: missingWeekRows },
  ] = await Promise.all([
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
      `SELECT o.id FROM "overlaps" o
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
           AND lower((SELECT span FROM "overlaps" WHERE id = t.overlap_id)) <= now() + interval '1 day'
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
    query<{ id: string }>(
      `SELECT c.id FROM connections c
         WHERE c.status = 'pending' AND (c.user_a = $1 OR c.user_b = $1)
         ORDER BY c.created_at ASC LIMIT 1`,
      [user.id],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM connections c
         JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
         WHERE c.status = 'accepted' AND (c.user_a = $1 OR c.user_b = $1)
           AND NOT EXISTS (
             SELECT 1 FROM windows w
             WHERE w.user_id = u.id AND w.span && tstzrange($2, $3)
           )`,
      [user.id, weekStart.toISOString(), weekEnd.toISOString()],
    ),
  ]);

  const connectionCount = Number(connRows[0]?.count ?? 0);
  const weekSet = Number(weekRows[0]?.count ?? 0) > 0;
  const unansweredOverlapId = overlapRows[0]?.id ?? null;
  const activeThreadId = threadRows[0]?.id ?? null;
  const pendingConnectionId = pendingRows[0]?.id ?? null;
  const friendsMissingWeek = Number(missingWeekRows[0]?.count ?? 0);

  let route: MeState["route"] = "people";
  const routeParams: Record<string, string> = {};

  if (!user.ageVerified) {
    route = "age";
  } else if (pendingConnectionId) {
    route = "accept";
    routeParams.id = pendingConnectionId;
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
  } else if (friendsMissingWeek > 0) {
    route = "empty";
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
    pendingConnectionId,
  };
}

export async function runMatchingForUser(_userId: string): Promise<void> {
  // Overlap matching runs on a schedule; week updates enqueue via windows insert.
}
