import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateCode(): string {
  return String(randomInt(100000, 999999));
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateShortCode(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const part = () =>
    Array.from({ length: 4 }, () => alphabet[randomInt(0, alphabet.length)]).join("");
  return `SU-${part()}-${part()}`;
}

export function generateInviteToken(): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: 16 }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}
