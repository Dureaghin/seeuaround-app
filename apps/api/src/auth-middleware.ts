import type { FastifyReply, FastifyRequest } from "fastify";
import { query } from "./db.js";
import { hashToken } from "./crypto.js";

export type AuthedUser = {
  id: string;
  email: string;
  handle: string;
  firstName: string;
  shortCode: string;
  timezone: string;
  paused: boolean;
  ageVerified: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthedUser;
  }
}

type UserRow = {
  id: string;
  email: string;
  handle: string;
  first_name: string;
  short_code: string;
  timezone: string;
  paused: boolean;
  pause_until: string | null;
  age_verified_at: string | null;
};

async function resolveExpiredPause(user: UserRow): Promise<UserRow> {
  if (!user.paused || !user.pause_until) return user;
  if (new Date(user.pause_until).getTime() > Date.now()) return user;
  await query(`UPDATE users SET paused = FALSE, pause_until = NULL WHERE id = $1`, [user.id]);
  return { ...user, paused: false, pause_until: null };
}

function mapUser(user: UserRow): AuthedUser {
  return {
    id: user.id,
    email: user.email,
    handle: user.handle,
    firstName: user.first_name,
    shortCode: user.short_code,
    timezone: user.timezone,
    paused: user.paused,
    ageVerified: Boolean(user.age_verified_at),
  };
}

async function loadSessionUser(tokenHash: string): Promise<AuthedUser | null> {
  const { rows } = await query<UserRow>(
    `SELECT u.id, u.email, u.handle, u.first_name, u.short_code, u.timezone,
            u.paused, u.pause_until, u.age_verified_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  const user = rows[0];
  if (!user) return null;
  return mapUser(await resolveExpiredPause(user));
}

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  const user = await loadSessionUser(hashToken(header.slice(7)));
  if (!user) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  request.user = user;
}

export async function optionalAuthHook(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return;
  const user = await loadSessionUser(hashToken(header.slice(7)));
  if (user) request.user = user;
}
