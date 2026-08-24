import { z } from "zod";

export const SITE = "https://seeuaround.com";

export const AppRoute = z.enum([
  "auth",
  "age",
  "invite",
  "overlap",
  "thread",
  "sunday",
  "pause",
  "people",
]);
export type AppRoute = z.infer<typeof AppRoute>;

export const MeStateSchema = z.object({
  route: AppRoute,
  routeParams: z.record(z.string()).optional(),
  user: z
    .object({
      id: z.string().uuid(),
      handle: z.string(),
      shortCode: z.string(),
      firstName: z.string(),
      ageVerified: z.boolean(),
      paused: z.boolean(),
      timezone: z.string(),
    })
    .nullable(),
  connectionCount: z.number(),
  weekSet: z.boolean(),
  unansweredOverlapId: z.string().uuid().nullable(),
  activeThreadId: z.string().uuid().nullable(),
  pendingHangoutCheck: z
    .object({
      overlapId: z.string().uuid(),
      label: z.string(),
    })
    .nullable(),
});
export type MeState = z.infer<typeof MeStateSchema>;

export const SendCodeSchema = z.object({
  email: z.string().email().max(254),
});
export type SendCodeInput = z.infer<typeof SendCodeSchema>;

export const VerifyCodeSchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});
export type VerifyCodeInput = z.infer<typeof VerifyCodeSchema>;

export const WeekWindowsSchema = z.object({
  nights: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      free: z.boolean(),
    }),
  ),
});
export type WeekWindowsInput = z.infer<typeof WeekWindowsSchema>;

export const OverlapRespondSchema = z.object({
  response: z.enum(["in", "out"]),
});
export type OverlapRespondInput = z.infer<typeof OverlapRespondSchema>;

export const ConnectionRequestSchema = z.object({
  shortCode: z.string().regex(/^SU-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
});
export type ConnectionRequestInput = z.infer<typeof ConnectionRequestSchema>;

export const ThreadMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type ThreadMessageInput = z.infer<typeof ThreadMessageSchema>;

export const PushReceivedSchema = z.object({
  notificationId: z.string().uuid(),
  platform: z.enum(["ios", "android"]),
});
export type PushReceivedInput = z.infer<typeof PushReceivedSchema>;

export const RegisterPushSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});
export type RegisterPushInput = z.infer<typeof RegisterPushSchema>;

export const AgeConfirmSchema = z.object({
  confirmed: z.literal(true),
});
export type AgeConfirmInput = z.infer<typeof AgeConfirmSchema>;

export type Connection = {
  id: string;
  handle: string;
  firstName: string;
  freeTonight: boolean;
  status: "accepted" | "pending_in" | "pending_out";
};

export type OverlapDetail = {
  id: string;
  dateLabel: string;
  members: { id: string; handle: string; firstName: string; response: string | null }[];
  myResponse: string | null;
};

export type ThreadDetail = {
  id: string;
  expiresAt: string;
  messages: {
    id: string;
    userId: string;
    handle: string;
    body: string;
    createdAt: string;
  }[];
};

export type WeekNight = {
  date: string;
  label: string;
  free: boolean;
};
