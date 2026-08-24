export type PauseDuration = "week" | "month" | "forever";

/** Next Sunday 18:00 in the user's IANA timezone. */
export function computePauseUntil(until: PauseDuration, timezone: string): Date | null {
  if (until === "forever") return null;
  if (until === "month") {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 30);
    return end;
  }

  const now = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now.getTime() + offset * 86_400_000);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(candidate);
    if (weekday.startsWith("Sun")) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(candidate);
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      if (!y || !m || !d) break;
      const localIso = `${y}-${m}-${d}T18:00:00`;
      const utcGuess = new Date(`${localIso}Z`);
      const tzHour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "numeric",
          hour12: false,
        }).format(utcGuess),
      );
      const adjustH = 18 - (Number.isFinite(tzHour) ? tzHour : 18);
      const target = new Date(utcGuess.getTime() + adjustH * 3_600_000);
      if (target.getTime() > now.getTime()) return target;
    }
  }

  const fallback = new Date(now);
  fallback.setUTCDate(fallback.getUTCDate() + 7);
  return fallback;
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
