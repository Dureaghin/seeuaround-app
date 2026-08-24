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

  for (const row of rows) {
    if (!Expo.isExpoPushToken(row.token)) continue;
    if (!isInDeliveryWindow(row.timezone)) continue;

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

function isInDeliveryWindow(timezone: string): boolean {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
    );
    return hour >= 8 && hour < 22;
  } catch {
    return true;
  }
}

export async function queueSundayPrompts() {
  await query(
    `INSERT INTO notifications (user_id, kind, title, body, data, scheduled_for)
     SELECT u.id, 'sunday', 'This week', 'Which nights are you free?', jsonb_build_object('route', 'sunday'), now()
     FROM users u
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications n
       WHERE n.user_id = u.id AND n.kind = 'sunday'
         AND n.created_at > date_trunc('week', now())
     )`,
  );
}

export { isInDeliveryWindow };
