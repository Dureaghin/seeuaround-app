export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  appUrl: process.env.APP_URL || "http://localhost:3001",
  webUrl: process.env.WEB_URL || "https://seeuaround.com",
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
  isProd: process.env.NODE_ENV === "production",
  /** When false, codes are logged until an email sender is configured. */
  authEmailEnabled: Boolean(process.env.RESEND_API_KEY),
};
