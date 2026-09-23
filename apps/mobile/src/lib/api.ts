import type { InviteInfo, InviteStatus, MeState } from "@seeuaround/shared";
import { getToken, clearToken } from "./auth-store";
import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const sendsJson =
    ["POST", "PUT", "PATCH"].includes(method) ||
    (method === "DELETE" && options.body != null);
  const body = options.body ?? (["POST", "PUT", "PATCH"].includes(method) ? "{}" : undefined);

  const headers: Record<string, string> = {
    ...(sendsJson ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, method, body, headers });
  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 401 && auth) {
      await clearToken();
      throw new ApiError(401, "session_expired");
    }
    throw new ApiError(res.status, errBody || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(500, "invalid_json");
  }
}

export const api = {
  sendCode: (email: string) =>
    request("/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, false),

  verifyCode: (email: string, code: string) =>
    request<{ token: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }, false),

  getMeState: () => request<MeState>("/me/state"),

  confirmAge: (source?: "apple" | "google" | "attested") =>
    request<MeState>("/me/age", {
      method: "POST",
      body: JSON.stringify({ confirmed: true, source }),
    }),

  setName: (firstName: string) =>
    request<MeState>("/me/name", {
      method: "POST",
      body: JSON.stringify({ firstName }),
    }),

  rotateShortCode: () => request<MeState>("/me/short-code", { method: "POST" }),

  pause: (until: "week" | "month" | "forever") =>
    request<MeState>("/me/pause", {
      method: "POST",
      body: JSON.stringify({ until }),
    }),

  unpause: () => request<MeState>("/me/unpause", { method: "POST" }),

  getWeek: () =>
    request<{ nights: { date: string; label: string; free: boolean }[] }>(
      "/windows/week",
    ),

  setWeek: (nights: { date: string; free: boolean }[]) =>
    request<MeState>("/windows/week", {
      method: "PUT",
      body: JSON.stringify({ nights }),
    }),

  getConnections: () =>
    request<{
      connections: {
        id: string;
        firstName: string;
        status: string;
        freeTonight: boolean;
        weekSet: boolean;
      }[];
      shortCode: string;
    }>("/connections"),

  getConnection: (id: string) =>
    request<{ firstName: string; status: string }>(`/connections/${id}`),

  requestConnection: (shortCode: string) =>
    request("/connections/request", {
      method: "POST",
      body: JSON.stringify({ shortCode }),
    }),

  acceptConnection: (id: string) =>
    request(`/connections/${id}/accept`, { method: "POST" }),

  declineConnection: (id: string) =>
    request(`/connections/${id}/decline`, { method: "POST" }),

  blockConnection: (id: string) =>
    request(`/connections/${id}/block`, { method: "POST" }),

  nudgeConnection: (id: string) =>
    request(`/connections/${id}/nudge`, { method: "POST" }),

  getOverlap: (id: string) =>
    request<{
      id: string;
      nightDate: string;
      expiresAt: string;
      dateLabel: string;
      members: { id: string; firstName: string; response: string | null; freeDates: string[] }[];
      myResponse: string | null;
    }>(`/overlaps/${id}`),

  respondOverlap: (id: string, response: "in" | "out") =>
    request<MeState>(`/overlaps/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ response }),
    }),

  getThread: (id: string) =>
    request<{
      id: string;
      expiresAt: string;
      nightDate: string;
      plan: {
        area: string;
        pinnedPlace: string | null;
        meetAt: string | null;
        meetHour: number | null;
        meetMinute: number | null;
        isHost: boolean;
        places: { name: string; votes: number; mine: boolean }[];
      };
      messages: {
        id: string;
        userId: string;
        firstName: string;
        body: string;
        createdAt: string;
        durationMs: number | null;
      }[];
    }>(`/threads/${id}`),

  sendMessage: (
    id: string,
    payload: { body?: string; audio?: string; mime?: string; durationMs?: number },
  ) =>
    request(`/threads/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  votePlace: (id: string, name: string) =>
    request<{
      plan: {
        area: string;
        pinnedPlace: string | null;
        meetAt: string | null;
        meetHour: number | null;
        meetMinute: number | null;
        isHost: boolean;
        places: { name: string; votes: number; mine: boolean }[];
      };
    }>(`/threads/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  addPlace: (id: string, name: string) =>
    request<{
      plan: {
        area: string;
        pinnedPlace: string | null;
        meetAt: string | null;
        meetHour: number | null;
        meetMinute: number | null;
        isHost: boolean;
        places: { name: string; votes: number; mine: boolean }[];
      };
    }>(`/threads/${id}/places`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  removePlace: (id: string, name: string) =>
    request<{
      plan: {
        area: string;
        pinnedPlace: string | null;
        meetAt: string | null;
        meetHour: number | null;
        meetMinute: number | null;
        isHost: boolean;
        places: { name: string; votes: number; mine: boolean }[];
      };
    }>(`/threads/${id}/places`, {
      method: "DELETE",
      body: JSON.stringify({ name }),
    }),

  clearVote: (id: string) =>
    request<{
      plan: {
        area: string;
        pinnedPlace: string | null;
        meetAt: string | null;
        meetHour: number | null;
        meetMinute: number | null;
        isHost: boolean;
        places: { name: string; votes: number; mine: boolean }[];
      };
    }>(`/threads/${id}/vote`, { method: "DELETE" }),

  setArea: (id: string, area: string) =>
    request<{
      plan: {
        area: string;
        pinnedPlace: string | null;
        meetAt: string | null;
        meetHour: number | null;
        meetMinute: number | null;
        isHost: boolean;
        places: { name: string; votes: number; mine: boolean }[];
      };
    }>(`/threads/${id}/area`, {
      method: "POST",
      body: JSON.stringify({ area }),
    }),

  setMeetTime: (id: string, hour: number, minute: 0 | 30) =>
    request<{
      plan: {
        area: string;
        pinnedPlace: string | null;
        meetAt: string | null;
        meetHour: number | null;
        meetMinute: number | null;
        isHost: boolean;
        places: { name: string; votes: number; mine: boolean }[];
      };
    }>(`/threads/${id}/time`, {
      method: "POST",
      body: JSON.stringify({ hour, minute }),
    }),

  searchPlaces: (q: string, area: string) =>
    request<{ places: { name: string; subtitle: string }[]; source: "google" | "openstreetmap" }>(
      "/places/search",
      {
        method: "POST",
        body: JSON.stringify({ q, area }),
      },
    ),

  suggestBars: (area: string) =>
    request<{ places: { name: string; subtitle: string }[]; source: "google" | "openstreetmap" }>(
      "/places/search",
      {
        method: "POST",
        body: JSON.stringify({ area, suggest: "bars" }),
      },
    ),

  messageAudioUrl: async (threadId: string, messageId: string) => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/threads/${threadId}/messages/${messageId}/audio`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "audio");
    return URL.createObjectURL(await res.blob());
  },

  createInvite: () => request<InviteInfo>("/invites", { method: "POST" }),

  getActiveInvite: () => request<InviteStatus>("/invites/active"),

  revokeInvite: () => request<{ ok: boolean }>("/invites/revoke", { method: "POST" }),

  previewInvite: (token: string) =>
    request<{ firstName: string }>(`/invites/${token}/preview`, {}, false),

  connectInvite: (token: string) =>
    request<MeState>(`/invites/${token}/connect`, {
      method: "POST",
    }),

  registerPush: (token: string, platform: "ios" | "android") =>
    request("/push/register", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    }),

  pushReceived: (notificationId: string, platform: "ios" | "android") =>
    request("/telemetry/push-received", {
      method: "POST",
      body: JSON.stringify({ notificationId, platform }),
    }),

  hangoutCheck: (overlapId: string, happened: boolean) =>
    request(`/hangout-check/${overlapId}`, {
      method: "POST",
      body: JSON.stringify({ happened }),
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  sendDeleteCode: () => request<{ ok: boolean }>("/me/delete/send-code", { method: "POST" }),

  deleteAccount: (code: string) =>
    request<void>("/me/delete", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

export type { MeState };
