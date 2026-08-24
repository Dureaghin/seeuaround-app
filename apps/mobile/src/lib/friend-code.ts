import { api, ApiError } from "./api";

const STORAGE_KEY = "seeuaround_pending_friend_code";
const SHORT_CODE_RE = /^SU-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

let memoryPending = "";

export function normalizeFriendCode(raw: string): string {
  const upper = raw.toUpperCase().trim();
  if (SHORT_CODE_RE.test(upper)) return upper;

  const alnum = upper.replace(/[^A-Z0-9]/g, "");
  if (alnum.startsWith("SU") && alnum.length >= 10) {
    const body = alnum.slice(2, 10);
    return `SU-${body.slice(0, 4)}-${body.slice(4, 8)}`;
  }
  return upper;
}

export function isValidFriendCode(raw: string): boolean {
  return SHORT_CODE_RE.test(normalizeFriendCode(raw));
}

export function resolveFriendCodeParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return normalizeFriendCode(decodeURIComponent(value));
  } catch {
    return normalizeFriendCode(value);
  }
}

export function rememberPendingFriendCode(code: string) {
  const normalized = normalizeFriendCode(code);
  if (!normalized) return;
  memoryPending = normalized;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, normalized);
  }
}

export function recallPendingFriendCode(): string {
  if (memoryPending) return memoryPending;
  if (typeof sessionStorage !== "undefined") {
    return sessionStorage.getItem(STORAGE_KEY) ?? "";
  }
  return "";
}

export function clearPendingFriendCode() {
  memoryPending = "";
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export async function applyPendingFriendCode(): Promise<"applied" | "invalid" | "none"> {
  const raw = recallPendingFriendCode();
  if (!raw) return "none";

  const code = normalizeFriendCode(raw);
  if (!isValidFriendCode(code)) {
    clearPendingFriendCode();
    return "invalid";
  }

  try {
    await api.requestConnection(code);
    clearPendingFriendCode();
    return "applied";
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      clearPendingFriendCode();
      return "invalid";
    }
    throw err;
  }
}

export async function connectWithFriendCode(code: string): Promise<void> {
  const normalized = normalizeFriendCode(code);
  if (!isValidFriendCode(normalized)) {
    throw new Error("invalid_format");
  }
  await api.requestConnection(normalized);
}
