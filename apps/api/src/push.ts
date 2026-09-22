import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { config } from "./config.js";
import { query } from "./db.js";

const expo = new Expo({ accessToken: config.expoAccessToken });

export async function deliverPendingNotifications() {
  const { rows } = await query<{
    id: string;
    user_id: string;
    title: string;
    body: string;
    data: Record<string, string>;
    token: string;
    platform: string;
    timezone: string;
  }>(
    `SELECT DISTINCT ON (n.id)
            n.id, n.user_id, n.title, n.body, n.data, pt.token, pt.platform, u.timezone
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     JOIN push_tokens pt ON pt.user_id = n.user_id
     WHERE n.sent_at IS NULL
       AND (n.scheduled_for IS NULL OR n.scheduled_for <= now())
     ORDER BY n.id, pt.created_at DESC NULLS LAST, n.created_at ASC
     LIMIT 100`,
  );

  const messages: ExpoPushMessage[] = [];
  const meta: { notifId: string; ticketId?: string }[] = [];
  const deferred: { id: string; at: string }[] = [];
  const badTokens: string[] = [];

  for (const row of rows) {
    if (!Expo.isExpoPushToken(row.token)) {
      badTokens.push(row.token);
      continue;
    }
    if (!isInDeliveryWindow(row.timezone)) {
      deferred.push({ id: row.id, at: nextDeliveryAt(row.timezone).toISOString() });
      continue;
    }

    messages.push({
      to: row.token,
      sound: "default",
      title: row.title,
      body: row.body,
      data: {
        ...row.data,
        notificationId: row.id,
      },
    });
    meta.push({ notifId: row.id });
  }

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
      const m = meta[i];
      if (ticket.status === "ok" && m) {
        sentIds.push({ notifId: m.notifId, ticketId: ticket.id });
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
  await query(
    `INSERT INTO notifications (user_id, kind, title, body, data, scheduled_for)
     SELECT u.id, 'sunday', 'This week', 'Which nights are you free?', jsonb_build_object('route', 'sunday'), now()
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
           AND n.created_at > date_trunc('week', now())
       )`,
  );
}

export { isInDeliveryWindow };
