const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());

/** Test OTP — never available in production. */
export function getDevAuthCode(): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  const configured = process.env.DEV_AUTH_CODE?.trim();
  if (configured) return configured;
  if (process.env.USE_PRODUCTION_AUTH === "true") return undefined;
  return "123456";
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  appUrl: process.env.APP_URL || "http://localhost:3001",
  webUrl: process.env.WEB_URL || "https://seeuaround.com",
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
  isProd: process.env.NODE_ENV === "production",
  authEmailEnabled: resendConfigured && process.env.USE_PRODUCTION_AUTH === "true",
  corsOrigins: [
    process.env.WEB_URL || "https://seeuaround.com",
    "http://localhost:8081",
    "http://localhost:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:3000",
  ],
  get devAuthCode() {
    return getDevAuthCode();
  },
};
