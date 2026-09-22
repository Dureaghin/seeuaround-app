import { api, ApiError } from "./api";

const STORAGE_KEY = "seeuaround_pending_invite";

let memoryPending = "";

export function rememberPendingInvite(token: string) {
  const clean = token.trim();
  if (!clean) return;
  memoryPending = clean;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, clean);
  }
}

export function recallPendingInvite(): string {
  if (memoryPending) return memoryPending;
  if (typeof sessionStorage !== "undefined") {
    return sessionStorage.getItem(STORAGE_KEY) ?? "";
  }
  return "";
}

export function clearPendingInvite() {
  memoryPending = "";
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

/** Ask to connect with the link that started sign-up. Clears it once the request is in, or if the link is dead. */
export async function applyPendingInvite(): Promise<"applied" | "invalid" | "none"> {
  const token = recallPendingInvite();
  if (!token) return "none";
  try {
    await api.connectInvite(token);
    clearPendingInvite();
    return "applied";
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      clearPendingInvite();
      return "invalid";
    }
    throw err;
  }
}
