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

export async function authHook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  const token = header.slice(7);
  const tokenHash = hashToken(token);
  const { rows } = await query<{
    id: string;
    email: string;
    handle: string;
    first_name: string;
    short_code: string;
    timezone: string;
    paused: boolean;
    age_verified_at: string | null;
  }>(
    `SELECT u.id, u.email, u.handle, u.first_name, u.short_code, u.timezone, u.paused, u.age_verified_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  const user = rows[0];
  if (!user) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  request.user = {
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

export async function optionalAuthHook(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return;
  const token = header.slice(7);
  const tokenHash = hashToken(token);
  const { rows } = await query<{
    id: string;
    email: string;
    handle: string;
    first_name: string;
    short_code: string;
    timezone: string;
    paused: boolean;
    age_verified_at: string | null;
  }>(
    `SELECT u.id, u.email, u.handle, u.first_name, u.short_code, u.timezone, u.paused, u.age_verified_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  const user = rows[0];
  if (!user) return;
  request.user = {
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
