const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());

/** Read at request time so Railway env updates apply without stale module cache. */
export function getDevAuthCode(): string | undefined {
  const fromEnv = process.env.DEV_AUTH_CODE?.trim();
  if (fromEnv) return fromEnv;
  if (!resendConfigured) return "123456";
  return undefined;
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  appUrl: process.env.APP_URL || "http://localhost:3001",
  webUrl: process.env.WEB_URL || "https://seeuaround.com",
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
  isProd: process.env.NODE_ENV === "production",
  authEmailEnabled: resendConfigured,
  get devAuthCode() {
    return getDevAuthCode();
  },
};
