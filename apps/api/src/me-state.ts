import type { MeState } from "@seeuaround/shared";
import { query } from "./db.js";
import type { AuthedUser } from "./auth-middleware.js";
import { currentWeekDates } from "./week.js";

export async function buildMeState(user: AuthedUser): Promise<MeState> {
  const weekDates = currentWeekDates();

  const { rows: stateRows } = await query<{
    connection_count: string;
    week_count: string;
    overlap_id: string | null;
    thread_id: string | null;
    thread_label: string | null;
    thread_night: string | null;
    hangout_overlap_id: string | null;
    hangout_night: string | null;
    pending_id: string | null;
    missing_week: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM connections
          WHERE status = 'accepted' AND (user_a = $1 OR user_b = $1)) AS connection_count,
       (SELECT COUNT(*)::text FROM windows
          WHERE user_id = $1
            AND to_char(lower(span) AT TIME ZONE 'UTC', 'YYYY-MM-DD') = ANY($2::text[])) AS week_count,
       (SELECT o.id::text FROM "overlaps" o
          JOIN overlap_members om ON om.overlap_id = o.id AND om.user_id = $1
          WHERE om.response IS NULL AND o.expires_at > now()
          ORDER BY o.created_at ASC LIMIT 1) AS overlap_id,
       (SELECT t.id::text FROM threads t
          JOIN "overlaps" o ON o.id = t.overlap_id
          JOIN overlap_members om ON om.overlap_id = t.overlap_id AND om.user_id = $1
          WHERE om.response = 'in'
            AND t.expires_at > now()
            AND EXISTS (
              SELECT 1 FROM windows w
              WHERE w.user_id = $1 AND lower(w.span)::date = o.night_date
            )
          ORDER BY t.expires_at ASC LIMIT 1) AS thread_id,
       (SELECT trim(to_char(o.night_date, 'Day')) FROM threads t
          JOIN "overlaps" o ON o.id = t.overlap_id
          JOIN overlap_members om ON om.overlap_id = t.overlap_id AND om.user_id = $1
          WHERE om.response = 'in'
            AND t.expires_at > now()
            AND EXISTS (
              SELECT 1 FROM windows w
              WHERE w.user_id = $1 AND lower(w.span)::date = o.night_date
            )
          ORDER BY t.expires_at ASC LIMIT 1) AS thread_label,
       (SELECT o.night_date::text FROM threads t
          JOIN "overlaps" o ON o.id = t.overlap_id
          JOIN overlap_members om ON om.overlap_id = t.overlap_id AND om.user_id = $1
          WHERE om.response = 'in'
            AND t.expires_at > now()
            AND EXISTS (
              SELECT 1 FROM windows w
              WHERE w.user_id = $1 AND lower(w.span)::date = o.night_date
            )
          ORDER BY t.expires_at ASC LIMIT 1) AS thread_night,
       (SELECT hc.overlap_id::text FROM hangout_checks hc
          WHERE hc.user_id = $1 AND hc.response IS NULL
            AND hc.night_date = (timezone(COALESCE(NULLIF($3, ''), 'America/New_York'), now()))::date - 1
          ORDER BY hc.night_date DESC LIMIT 1) AS hangout_overlap_id,
       (SELECT hc.night_date::text FROM hangout_checks hc
          WHERE hc.user_id = $1 AND hc.response IS NULL
            AND hc.night_date = (timezone(COALESCE(NULLIF($3, ''), 'America/New_York'), now()))::date - 1
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
              WHERE w.user_id = u.id
                AND to_char(lower(w.span) AT TIME ZONE 'UTC', 'YYYY-MM-DD') = ANY($2::text[])
            )) AS missing_week`,
    [user.id, weekDates, user.timezone || "America/New_York"],
  );
  const state = stateRows[0];

  const connectionCount = Number(state?.connection_count ?? 0);
  const weekSet = Number(state?.week_count ?? 0) > 0;
  const unansweredOverlapId = state?.overlap_id ?? null;
  const activeThreadId = state?.thread_id ?? null;
  const activeThreadLabel = state?.thread_label?.trim() || null;
  const activeThreadNightDate = state?.thread_night?.slice(0, 10) || null;
  let activeThreadNames: string[] = [];
  if (activeThreadId) {
    const { rows: nameRows } = await query<{ first_name: string }>(
      `SELECT u.first_name
       FROM overlap_members om
       JOIN threads t ON t.overlap_id = om.overlap_id
       JOIN users u ON u.id = om.user_id
       WHERE t.id = $1 AND om.response = 'in' AND om.user_id <> $2
         AND u.first_name <> ''
       ORDER BY u.first_name ASC
       LIMIT 3`,
      [activeThreadId, user.id],
    );
    activeThreadNames = nameRows.map((row) => row.first_name);
  }
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
  } else if (unansweredOverlapId) {
    route = "overlap";
    routeParams.id = unansweredOverlapId;
  } else if (activeThreadId) {
    route = "thread";
    routeParams.id = activeThreadId;
  } else if (connectionCount < 5) {
    route = "invite";
  } else if (!weekSet) {
    route = "sunday";
  } else if (user.paused) {
    route = "pause";
  } else if (friendsMissingWeek > 0) {
    route = "empty";
  }

  const night = (state?.hangout_night ?? "").slice(0, 10);
  const [year, month, day] = night.split("-").map(Number);
  const weekday =
    year && month && day
      ? new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "long" })
      : "that night";
  const pendingHangoutCheck = state?.hangout_overlap_id
    ? {
        overlapId: state.hangout_overlap_id,
        label: `Did ${weekday} happen?`,
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
    activeThreadLabel,
    activeThreadNames,
    activeThreadNightDate,
    pendingHangoutCheck,
    pendingConnectionId,
  };
}
