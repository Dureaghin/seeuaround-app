import type { FastifyInstance } from "fastify";
import {
  AgeConfirmSchema,
  ConnectionRequestSchema,
  OverlapRespondSchema,
  PushReceivedSchema,
  RegisterPushSchema,
  SendCodeSchema,
  ThreadMessageSchema,
  VerifyCodeSchema,
  WeekWindowsSchema,
} from "@seeuaround/shared";
import { authHook } from "../auth-middleware.js";
import {
  generateCode,
  generateInviteToken,
  generateShortCode,
  generateToken,
  hashToken,
  isDisposableEmail,
  normalizeEmail,
  safeEqual,
} from "../crypto.js";
import { query } from "../db.js";
import { buildMeState, runMatchingForUser } from "../me-state.js";
import { config } from "../config.js";

const GENERIC_AUTH_MSG = {
  ok: true,
  message: "If that email is registered, a code is on its way.",
};

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true }));

  app.post("/auth/send-code", async (request, reply) => {
    const parsed = SendCodeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_email" });

    const email = normalizeEmail(parsed.data.email);
    if (isDisposableEmail(email)) return GENERIC_AUTH_MSG;

    const code = config.devAuthCode ?? generateCode();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(`DELETE FROM auth_codes WHERE email = $1`, [email]);
    await query(
      `INSERT INTO auth_codes (email, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [email, codeHash, expiresAt.toISOString()],
    );

    const { rows } = await query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );

    if (!rows[0]) {
      const handle = email.split("@")[0].slice(0, 20);
      let shortCode = generateShortCode();
      for (let i = 0; i < 5; i++) {
        try {
          await query(
            `INSERT INTO users (email, handle, first_name, short_code) VALUES ($1, $2, $3, $4)`,
            [email, handle, handle, shortCode],
          );
          break;
        } catch {
          shortCode = generateShortCode();
        }
      }
    }

    if (!config.authEmailEnabled) {
      request.log.info({ email, devCode: code }, "dev auth code (no email sender configured)");
    }
    return GENERIC_AUTH_MSG;
  });

  app.post("/auth/verify", async (request, reply) => {
    const parsed = VerifyCodeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

    const email = normalizeEmail(parsed.data.email);
    const { rows } = await query<{
      id: string;
      code_hash: string;
      attempts: number;
      expires_at: string;
    }>(
      `SELECT id, code_hash, attempts, expires_at FROM auth_codes
       WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at) < new Date()) {
      return reply.code(400).send({ error: "invalid_code" });
    }
    if (row.attempts >= 5) return reply.code(400).send({ error: "code_expired" });

    const codeHash = hashToken(parsed.data.code);
    if (!safeEqual(codeHash, row.code_hash)) {
      await query(`UPDATE auth_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
      return reply.code(400).send({ error: "invalid_code" });
    }

    await query(`DELETE FROM auth_codes WHERE email = $1`, [email]);
    const { rows: userRows } = await query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );
    const userId = userRows[0]?.id;
    if (!userId) return reply.code(400).send({ error: "invalid_code" });

    const token = generateToken();
    const tokenHash = hashToken(token);
    const sessionExpires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, sessionExpires.toISOString()],
    );

    return { token };
  });

  app.get("/me/state", { preHandler: authHook }, async (request) =>
    buildMeState(request.user!),
  );

  app.post("/me/age", { preHandler: authHook }, async (request, reply) => {
    const parsed = AgeConfirmSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });
    await query(`UPDATE users SET age_verified_at = now() WHERE id = $1`, [request.user!.id]);
    return buildMeState({ ...request.user!, ageVerified: true });
  });

  app.post("/me/pause", { preHandler: authHook }, async (request) => {
    await query(`UPDATE users SET paused = TRUE WHERE id = $1`, [request.user!.id]);
    return buildMeState({ ...request.user!, paused: true });
  });

  app.post("/me/unpause", { preHandler: authHook }, async (request) => {
    await query(`UPDATE users SET paused = FALSE WHERE id = $1`, [request.user!.id]);
    return buildMeState({ ...request.user!, paused: false });
  });

  app.patch("/me/timezone", { preHandler: authHook }, async (request, reply) => {
    const tz = (request.body as { timezone?: string })?.timezone;
    if (!tz) return reply.code(400).send({ error: "invalid_timezone" });
    await query(`UPDATE users SET timezone = $1 WHERE id = $2`, [tz, request.user!.id]);
    return { ok: true };
  });

  app.put("/windows/week", { preHandler: authHook }, async (request, reply) => {
    const parsed = WeekWindowsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

    const userId = request.user!.id;
    const dates = parsed.data.nights.filter((n) => n.free).map((n) => n.date);
    const weekDates = parsed.data.nights.map((n) => n.date);

    await query(
      `DELETE FROM windows WHERE user_id = $1 AND lower(span)::date = ANY($2::date[])`,
      [userId, weekDates],
    );

    for (const date of dates) {
      await query(
        `INSERT INTO windows (user_id, span, source) VALUES ($1, tstzrange($2, $3), 'manual')`,
        [userId, `${date}T18:00:00.000Z`, `${date}T23:59:59.000Z`],
      );
    }

    await runMatchingForUser(userId);
    return buildMeState(request.user!);
  });

  app.get("/windows/week", { preHandler: authHook }, async (request) => {
    const userId = request.user!.id;
    const { rows } = await query<{ date: string }>(
      `SELECT to_char(lower(span) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date
       FROM windows WHERE user_id = $1
         AND lower(span) >= date_trunc('week', now()) + interval '1 day'
       ORDER BY lower(span)`,
      [userId],
    );
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const start = new Date();
    const monday = new Date(start);
    monday.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    return {
      nights: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const date = d.toISOString().slice(0, 10);
        return { date, label: labels[i], free: rows.some((r) => r.date === date) };
      }),
    };
  });

  app.get("/connections", { preHandler: authHook }, async (request) => {
    const userId = request.user!.id;
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const { rows } = await query<{
      id: string;
      handle: string;
      first_name: string;
      status: string;
      free_tonight: boolean;
      week_set: boolean;
    }>(
      `SELECT c.id, u.handle, u.first_name, c.status,
         EXISTS (
           SELECT 1 FROM windows w
           WHERE w.user_id = u.id
             AND w.span && tstzrange(date_trunc('day', now()), date_trunc('day', now()) + interval '1 day')
         ) AS free_tonight,
         EXISTS (
           SELECT 1 FROM windows w
           WHERE w.user_id = u.id
             AND w.span && tstzrange($2, $3)
         ) AS week_set
       FROM connections c
       JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
       WHERE c.user_a = $1 OR c.user_b = $1
       ORDER BY u.handle`,
      [userId, weekStart.toISOString(), weekEnd.toISOString()],
    );

    return {
      connections: rows.map((r) => ({
        id: r.id,
        handle: r.handle,
        firstName: r.first_name,
        status: r.status,
        freeTonight: r.free_tonight,
        weekSet: r.week_set,
      })),
      shortCode: request.user!.shortCode,
    };
  });

  app.get("/connections/:id", { preHandler: authHook }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await query<{ first_name: string; handle: string; status: string }>(
      `SELECT u.first_name, u.handle, c.status
       FROM connections c
       JOIN users u ON u.id = CASE WHEN c.user_a = $2 THEN c.user_b ELSE c.user_a END
       WHERE c.id = $1 AND (c.user_a = $2 OR c.user_b = $2)`,
      [id, request.user!.id],
    );
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    return {
      firstName: rows[0].first_name,
      handle: rows[0].handle,
      status: rows[0].status,
    };
  });

  app.post("/connections/request", { preHandler: authHook }, async (request, reply) => {
    const parsed = ConnectionRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_code" });

    const { rows: targetRows } = await query<{ id: string }>(
      `SELECT id FROM users WHERE short_code = $1`,
      [parsed.data.shortCode],
    );
    const targetId = targetRows[0]?.id;
    if (!targetId || targetId === request.user!.id) {
      return reply.code(404).send({ error: "not_found" });
    }

    const [userA, userB] = [request.user!.id, targetId].sort();
    await query(
      `INSERT INTO connections (user_a, user_b, status) VALUES ($1, $2, 'pending')
       ON CONFLICT (user_a, user_b) DO NOTHING`,
      [userA, userB],
    );
    return { ok: true };
  });

  app.post("/connections/:id/accept", { preHandler: authHook }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rowCount } = await query(
      `UPDATE connections SET status = 'accepted'
       WHERE id = $1 AND (user_a = $2 OR user_b = $2)`,
      [id, request.user!.id],
    );
    if (!rowCount) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  app.get("/overlaps/:id", { preHandler: authHook }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows: overlapRows } = await query<{ night_date: string; expires_at: string }>(
      `SELECT o.night_date::text, o.expires_at::text FROM "overlaps" o
       JOIN overlap_members om ON om.overlap_id = o.id AND om.user_id = $2
       WHERE o.id = $1`,
      [id, request.user!.id],
    );
    if (!overlapRows[0]) return reply.code(404).send({ error: "not_found" });

    const { rows: members } = await query<{
      id: string;
      handle: string;
      first_name: string;
      response: string | null;
    }>(
      `SELECT u.id, u.handle, u.first_name, om.response
       FROM overlap_members om JOIN users u ON u.id = om.user_id
       WHERE om.overlap_id = $1`,
      [id],
    );
    const my = members.find((m) => m.id === request.user!.id);

    return {
      id,
      nightDate: overlapRows[0].night_date,
      expiresAt: overlapRows[0].expires_at,
      dateLabel: new Date(overlapRows[0].night_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      members: members.map((m) => ({
        id: m.id,
        handle: m.handle,
        firstName: m.first_name,
        response: m.response,
      })),
      myResponse: my?.response ?? null,
    };
  });

  app.post("/overlaps/:id/respond", { preHandler: authHook }, async (request, reply) => {
    const parsed = OverlapRespondSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

    const { id } = request.params as { id: string };
    await query(
      `UPDATE overlap_members SET response = $1 WHERE overlap_id = $2 AND user_id = $3`,
      [parsed.data.response === "in" ? "in" : "out", id, request.user!.id],
    );

    if (parsed.data.response === "in") {
      const { rows: ins } = await query<{ count: string }>(
        `SELECT COUNT(*) FILTER (WHERE response = 'in')::text AS count
         FROM overlap_members WHERE overlap_id = $1`,
        [id],
      );
      if (Number(ins[0]?.count ?? 0) >= 2) {
        const { rows: threadRows } = await query<{ id: string }>(
          `SELECT id FROM threads WHERE overlap_id = $1`,
          [id],
        );
        if (!threadRows[0]) {
          const { rows: overlapRows } = await query<{ expires_at: string }>(
            `SELECT expires_at FROM "overlaps" WHERE id = $1`,
            [id],
          );
          await query(`INSERT INTO threads (overlap_id, expires_at) VALUES ($1, $2)`, [
            id,
            overlapRows[0].expires_at,
          ]);
        }
      }
    }

    return buildMeState(request.user!);
  });

  app.get("/threads/:id", { preHandler: authHook }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows: threadRows } = await query<{ expires_at: string }>(
      `SELECT t.expires_at FROM threads t
       JOIN overlap_members om ON om.overlap_id = t.overlap_id AND om.user_id = $2
       WHERE t.id = $1 AND om.response = 'in'`,
      [id, request.user!.id],
    );
    if (!threadRows[0]) return reply.code(404).send({ error: "not_found" });

    const { rows: messages } = await query<{
      id: string;
      user_id: string;
      handle: string;
      body: string;
      created_at: string;
    }>(
      `SELECT m.id, m.user_id, u.handle, m.body, m.created_at
       FROM messages m JOIN users u ON u.id = m.user_id
       WHERE m.thread_id = $1 ORDER BY m.created_at ASC`,
      [id],
    );

    return {
      id,
      expiresAt: threadRows[0].expires_at,
      messages: messages.map((m) => ({
        id: m.id,
        userId: m.user_id,
        handle: m.handle,
        body: m.body,
        createdAt: m.created_at,
      })),
    };
  });

  app.post("/threads/:id/messages", { preHandler: authHook }, async (request, reply) => {
    const parsed = ThreadMessageSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

    const { id } = request.params as { id: string };
    const { rows } = await query<{ id: string }>(
      `INSERT INTO messages (thread_id, user_id, body)
       SELECT t.id, $2, $3 FROM threads t
       JOIN overlap_members om ON om.overlap_id = t.overlap_id AND om.user_id = $2 AND om.response = 'in'
       WHERE t.id = $1 RETURNING id`,
      [id, request.user!.id, parsed.data.body],
    );
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    return { id: rows[0].id };
  });

  app.post("/push/register", { preHandler: authHook }, async (request, reply) => {
    const parsed = RegisterPushSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

    await query(
      `INSERT INTO push_tokens (user_id, token, platform) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, token) DO UPDATE SET platform = EXCLUDED.platform`,
      [request.user!.id, parsed.data.token, parsed.data.platform],
    );
    return { ok: true };
  });

  app.post("/telemetry/push-received", { preHandler: authHook }, async (request, reply) => {
    const parsed = PushReceivedSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

    await query(
      `UPDATE notifications SET received_at = now(), platform = $1
       WHERE id = $2 AND user_id = $3`,
      [parsed.data.platform, parsed.data.notificationId, request.user!.id],
    );
    return { ok: true };
  });

  app.post("/invites", { preHandler: authHook }, async (request) => {
    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO invite_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [request.user!.id, tokenHash, expiresAt.toISOString()],
    );
    return { url: `${config.webUrl}/j/${token}` };
  });

  app.get("/invites/:token/preview", async (request, reply) => {
    const { token } = request.params as { token: string };
    const tokenHash = hashToken(token);
    const { rows } = await query<{ first_name: string }>(
      `SELECT u.first_name FROM invite_tokens it
       JOIN users u ON u.id = it.user_id
       WHERE it.token_hash = $1 AND it.revoked_at IS NULL
         AND it.expires_at > now() AND it.uses_remaining > 0`,
      [tokenHash],
    );
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    return { firstName: rows[0].first_name };
  });

  app.post("/invites/:token/connect", { preHandler: authHook }, async (request, reply) => {
    const { token } = request.params as { token: string };
    const tokenHash = hashToken(token);
    const { rows } = await query<{ user_id: string }>(
      `SELECT user_id FROM invite_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL
         AND expires_at > now() AND uses_remaining > 0`,
      [tokenHash],
    );
    const inviterId = rows[0]?.user_id;
    if (!inviterId || inviterId === request.user!.id) {
      return reply.code(404).send({ error: "not_found" });
    }

    const [userA, userB] = [request.user!.id, inviterId].sort();
    await query(
      `INSERT INTO connections (user_a, user_b, status) VALUES ($1, $2, 'pending')
       ON CONFLICT (user_a, user_b) DO NOTHING`,
      [userA, userB],
    );
    await query(
      `UPDATE invite_tokens SET uses_remaining = uses_remaining - 1
       WHERE token_hash = $1 AND uses_remaining > 0`,
      [tokenHash],
    );

    return buildMeState(request.user!);
  });

  app.post("/hangout-check/:overlapId", { preHandler: authHook }, async (request, reply) => {
    const { overlapId } = request.params as { overlapId: string };
    const happened = (request.body as { happened?: boolean })?.happened;
    if (typeof happened !== "boolean") {
      return reply.code(400).send({ error: "invalid_request" });
    }
    await query(
      `UPDATE hangout_checks SET response = $1 WHERE overlap_id = $2 AND user_id = $3`,
      [happened ? "yes" : "no", overlapId, request.user!.id],
    );
    return { ok: true };
  });
}
