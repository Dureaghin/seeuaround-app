const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());

/** Test OTP. Explicit DEV_AUTH_CODE always wins; otherwise off when production auth is on. */
export function getDevAuthCode(): string | undefined {
  const configured = process.env.DEV_AUTH_CODE?.trim();
  if (configured) return configured;
  if (process.env.USE_PRODUCTION_AUTH === "true") return undefined;
  return "123456";
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  appUrl: process.env.APP_URL || "http://localhost:3001",
  webUrl: process.env.WEB_URL || "https://seeuaround.com",
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
  isProd: process.env.NODE_ENV === "production",
  authEmailEnabled: resendConfigured && process.env.USE_PRODUCTION_AUTH === "true",
  get devAuthCode() {
    return getDevAuthCode();
  },
};
