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

  const { rows: stateRows } = await query<{
    connection_count: string;
    week_count: string;
    overlap_id: string | null;
    thread_id: string | null;
    hangout_overlap_id: string | null;
    hangout_night: string | null;
    pending_id: string | null;
    missing_week: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM connections
          WHERE status = 'accepted' AND (user_a = $1 OR user_b = $1)) AS connection_count,
       (SELECT COUNT(*)::text FROM windows
          WHERE user_id = $1 AND span && tstzrange($2, $3)) AS week_count,
       (SELECT o.id::text FROM "overlaps" o
          JOIN overlap_members om ON om.overlap_id = o.id AND om.user_id = $1
          WHERE om.response IS NULL AND o.expires_at > now()
          ORDER BY o.created_at ASC LIMIT 1) AS overlap_id,
       (SELECT t.id::text FROM threads t
          JOIN overlap_members om ON om.overlap_id = t.overlap_id AND om.user_id = $1
          WHERE om.response = 'in'
            AND t.expires_at > now()
            AND lower((SELECT span FROM "overlaps" WHERE id = t.overlap_id)) <= now() + interval '1 day'
          ORDER BY t.expires_at ASC LIMIT 1) AS thread_id,
       (SELECT hc.overlap_id::text FROM hangout_checks hc
          WHERE hc.user_id = $1 AND hc.response IS NULL
            AND hc.night_date = (CURRENT_DATE - interval '1 day')::date
          ORDER BY hc.night_date DESC LIMIT 1) AS hangout_overlap_id,
       (SELECT hc.night_date::text FROM hangout_checks hc
          WHERE hc.user_id = $1 AND hc.response IS NULL
            AND hc.night_date = (CURRENT_DATE - interval '1 day')::date
          ORDER BY hc.night_date DESC LIMIT 1) AS hangout_night,
       (SELECT c.id::text FROM connections c
          WHERE c.status = 'pending' AND (c.user_a = $1 OR c.user_b = $1)
            AND (c.requested_by IS NULL OR c.requested_by <> $1)
          ORDER BY c.created_at ASC LIMIT 1) AS pending_id,
       (SELECT COUNT(*)::text
          FROM connections c
          JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
          WHERE c.status = 'accepted' AND (c.user_a = $1 OR c.user_b = $1)
            AND NOT EXISTS (
              SELECT 1 FROM windows w
              WHERE w.user_id = u.id AND w.span && tstzrange($2, $3)
            )) AS missing_week`,
    [user.id, weekStart.toISOString(), weekEnd.toISOString()],
  );
  const state = stateRows[0];

  const connectionCount = Number(state?.connection_count ?? 0);
  const weekSet = Number(state?.week_count ?? 0) > 0;
  const unansweredOverlapId = state?.overlap_id ?? null;
  const activeThreadId = state?.thread_id ?? null;
  const pendingConnectionId = state?.pending_id ?? null;
  const friendsMissingWeek = Number(state?.missing_week ?? 0);

  let route: MeState["route"] = "people";
  const routeParams: Record<string, string> = {};

  if (!user.ageVerified) {
    route = "age";
  } else if (!user.nameSet) {
    route = "name";
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

  const pendingHangoutCheck = state?.hangout_overlap_id
    ? {
        overlapId: state.hangout_overlap_id,
        label: `Did ${new Date(state.hangout_night ?? "").toLocaleDateString("en-US", { weekday: "long" })} happen?`,
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
