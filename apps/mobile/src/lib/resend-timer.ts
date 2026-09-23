const KEY = "seeuaround_code_resend_until";
const DEFAULT_SEC = 42;

let memoryUntil = 0;

export function armResendCooldown(sec = DEFAULT_SEC): void {
  const until = Date.now() + sec * 1000;
  memoryUntil = until;
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(KEY, String(until));
    }
  } catch {
    // Native / private mode — module memory still holds for this session.
  }
}

export function remainingResendSec(): number {
  let until = memoryUntil;
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = Number(sessionStorage.getItem(KEY) || 0);
      if (stored) until = stored;
    }
  } catch {
    // keep memoryUntil
  }
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
