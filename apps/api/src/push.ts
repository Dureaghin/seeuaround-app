import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { config } from "./config.js";
import { query } from "./db.js";
import { isLocalSundaySixPm } from "./pause-until.js";

const expo = new Expo({ accessToken: config.expoAccessToken });

type DueNotification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, string>;
  token: string;
  platform: string;
  timezone: string;
};

function singlePush(row: DueNotification): { message: ExpoPushMessage; notifIds: string[] } {
  return {
    message: {
      to: row.token,
      sound: "default",
      title: row.title,
      body: row.body,
      data: { ...row.data, notificationId: row.id },
    },
    notifIds: [row.id],
  };
}

/** Several overlap alerts due at once become one morning push. */
export function collapseOverlapPushes(
  rows: DueNotification[],
): { message: ExpoPushMessage; notifIds: string[] }[] {
  const byUser = new Map<string, DueNotification[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const outbound: { message: ExpoPushMessage; notifIds: string[] }[] = [];
  for (const list of byUser.values()) {
    const overlaps = list.filter((row) => row.kind === "overlap");
    const rest = list.filter((row) => row.kind !== "overlap");
    if (overlaps.length > 1) {
      const first = overlaps[0];
      const nights = [...new Set(overlaps.map((row) => row.title).filter(Boolean))];
      const when =
        nights.length >= 2
          ? `${nights.slice(0, -1).join(", ")} and ${nights[nights.length - 1]}`
          : "A few nights";
      outbound.push({
        message: {
          to: first.token,
          sound: "default",
          title: "This week",
          body: `${when}. ${overlaps.length} nights line up.`,
          data: { ...first.data, notificationId: first.id },
        },
        notifIds: overlaps.map((row) => row.id),
      });
    } else {
      for (const row of overlaps) outbound.push(singlePush(row));
    }
    for (const row of rest) outbound.push(singlePush(row));
  }
  return outbound;
}

export async function deliverPendingNotifications() {
  const { rows } = await query<DueNotification>(
    `SELECT DISTINCT ON (n.id)
            n.id, n.user_id, n.kind, n.title, n.body, n.data, pt.token, pt.platform, u.timezone
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     JOIN push_tokens pt ON pt.user_id = n.user_id
     WHERE n.sent_at IS NULL
       AND (n.scheduled_for IS NULL OR n.scheduled_for <= now())
     ORDER BY n.id, pt.created_at DESC NULLS LAST, n.created_at ASC
     LIMIT 100`,
  );

  const deferred: { id: string; at: string }[] = [];
  const badTokens: string[] = [];
  const ready: DueNotification[] = [];

  for (const row of rows) {
    if (!Expo.isExpoPushToken(row.token)) {
      badTokens.push(row.token);
      continue;
    }
    if (!isInDeliveryWindow(row.timezone)) {
      deferred.push({ id: row.id, at: nextDeliveryAt(row.timezone).toISOString() });
      continue;
    }
    ready.push(row);
  }

  const outbound = collapseOverlapPushes(ready);
  const messages = outbound.map((item) => item.message);
  const meta = outbound.map((item) => item.notifIds);

  if (badTokens.length > 0) {
    await query(`DELETE FROM push_tokens WHERE token = ANY($1::text[])`, [badTokens]);
  }
  if (deferred.length > 0) {
    await query(
      `UPDATE notifications AS n
       SET scheduled_for = v.at
       FROM (
         SELECT UNNEST($1::uuid[]) AS id, UNNEST($2::timestamptz[]) AS at
       ) AS v
       WHERE n.id = v.id AND n.sent_at IS NULL`,
      [deferred.map((d) => d.id), deferred.map((d) => d.at)],
    );
  }

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  let i = 0;
  const sentIds: { notifId: string; ticketId: string }[] = [];

  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    for (const ticket of tickets) {
      const idsForMessage = meta[i] ?? [];
      if (ticket.status === "ok") {
        for (const notifId of idsForMessage) {
          sentIds.push({ notifId, ticketId: ticket.id });
        }
      }
      i++;
    }
  }

  if (sentIds.length === 0) return;

  const ids = sentIds.map((s) => s.notifId);
  const ticketIds = sentIds.map((s) => s.ticketId);
  await query(
    `UPDATE notifications AS n
     SET sent_at = now(),
         ticket_id = v.ticket_id
     FROM (
       SELECT UNNEST($1::uuid[]) AS id, UNNEST($2::text[]) AS ticket_id
     ) AS v
     WHERE n.id = v.id`,
    [ids, ticketIds],
  );
}

function isInDeliveryWindow(timezone: string, at = new Date()): boolean {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      }).format(at),
    );
    const normalized = hour === 24 ? 0 : hour;
    return normalized >= 8 && normalized < 22;
  } catch {
    return true;
  }
}

function nextDeliveryAt(timezone: string): Date {
  const start = Date.now();
  for (let hours = 1; hours <= 16; hours++) {
    const at = new Date(start + hours * 3_600_000);
    if (isInDeliveryWindow(timezone, at)) return at;
  }
  return new Date(start + 8 * 3_600_000);
}

export async function queueNotification(input: {
  userId: string;
  kind: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  await query(
    `INSERT INTO notifications (user_id, kind, title, body, data)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [input.userId, input.kind, input.title, input.body, JSON.stringify(input.data ?? {})],
  );
}

export async function queueSundayPrompts() {
  const { rows } = await query<{ id: string; timezone: string }>(
    `SELECT u.id, u.timezone
     FROM users u
     WHERE u.paused = FALSE
       AND u.age_verified_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM windows w
         WHERE w.user_id = u.id
           AND w.span && tstzrange(now(), now() + interval '7 days')
       )
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.user_id = u.id AND n.kind = 'sunday'
           AND n.created_at > now() - interval '6 days'
       )`,
  );
  const due = rows.filter((user) => isLocalSundaySixPm(user.timezone || "America/New_York"));
  if (due.length === 0) return;
  await query(
    `INSERT INTO notifications (user_id, kind, title, body, data, scheduled_for)
     SELECT id, 'sunday', 'This week', 'Which nights are you free?',
            jsonb_build_object('route', 'sunday'), now()
     FROM unnest($1::uuid[]) AS id`,
    [due.map((user) => user.id)],
  );
}

export async function purgeExpiredThreads() {
  await query(`DELETE FROM threads WHERE expires_at <= now()`);
}

/** The morning after a night people said yes to: one question, then it is gone. */
export async function queueHangoutChecks() {
  const { rows } = await query<{ user_id: string; night_date: string }>(
    `INSERT INTO hangout_checks (overlap_id, user_id, night_date)
     SELECT om.overlap_id, om.user_id, o.night_date
     FROM overlap_members om
     JOIN "overlaps" o ON o.id = om.overlap_id
     JOIN users u ON u.id = om.user_id
     WHERE om.response = 'in'
       AND o.night_date = (timezone(COALESCE(NULLIF(u.timezone, ''), 'America/New_York'), now()))::date - 1
     ON CONFLICT (overlap_id, user_id) DO NOTHING
     RETURNING user_id, night_date::text`,
  );

  for (const row of rows) {
    const [year, month, day] = row.night_date.slice(0, 10).split("-").map(Number);
    const weekday = new Date(year, month - 1, day).toLocaleDateString("en-US", {
      weekday: "long",
    });
    await queueNotification({
      userId: row.user_id,
      kind: "hangout",
      title: weekday,
      body: `Did ${weekday} happen?`,
      data: { route: "people" },
    });
  }
}

export { isInDeliveryWindow };
