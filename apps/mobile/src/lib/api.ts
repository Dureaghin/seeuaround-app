import type { MeState } from "@seeuaround/shared";
import { getToken } from "./auth-store";
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
  const sendsJson = ["POST", "PUT", "PATCH"].includes(method);
  const body = options.body ?? (sendsJson ? "{}" : undefined);

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
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
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

  confirmAge: () =>
    request<MeState>("/me/age", {
      method: "POST",
      body: JSON.stringify({ confirmed: true }),
    }),

  pause: () => request<MeState>("/me/pause", { method: "POST" }),

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
        handle: string;
        firstName: string;
        status: string;
        freeTonight: boolean;
        weekSet: boolean;
      }[];
      shortCode: string;
    }>("/connections"),

  getConnection: (id: string) =>
    request<{ firstName: string; handle: string; status: string }>(`/connections/${id}`),

  requestConnection: (shortCode: string) =>
    request("/connections/request", {
      method: "POST",
      body: JSON.stringify({ shortCode }),
    }),

  acceptConnection: (id: string) =>
    request(`/connections/${id}/accept`, { method: "POST" }),

  getOverlap: (id: string) =>
    request<{
      id: string;
      nightDate: string;
      expiresAt: string;
      dateLabel: string;
      members: { id: string; handle: string; firstName: string; response: string | null }[];
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
      messages: { id: string; userId: string; handle: string; body: string; createdAt: string }[];
    }>(`/threads/${id}`),

  sendMessage: (id: string, body: string) =>
    request(`/threads/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  createInvite: () => request<{ url: string }>("/invites", { method: "POST" }),

  previewInvite: (token: string) =>
    request<{ firstName: string }>(`/invites/${token}/preview`, {}, false),

  connectInvite: (token: string) =>
    request<import("@seeuaround/shared").MeState>(`/invites/${token}/connect`, {
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
