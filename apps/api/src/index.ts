import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import PgBoss from "pg-boss";
import { config, getDevAuthCode } from "./config.js";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import { registerRoutes } from "./routes/index.js";
import { runMatchingSweep } from "./matching.js";
import { deliverPendingNotifications, purgeExpiredThreads, queueSundayPrompts } from "./push.js";

async function main() {
  if (process.env.RUN_MIGRATIONS === "true") {
    await migrate();
  }

  const app = Fastify({
    trustProxy: process.env.TRUST_PROXY === "true",
    bodyLimit: 100_000,
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie"],
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url
              .replace(/\/invites\/[^/?]+/g, "/invites/[redacted]")
              .replace(/\/j\/[^/?]+/g, "/j/[redacted]"),
            host: request.host,
            remoteAddress: request.ip,
            id: request.id,
          };
        },
      },
    },
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Cache-Control", "no-store");
    return payload;
  });

  app.setErrorHandler((err: unknown, request, reply) => {
    const error = err as { code?: string; statusCode?: number; message?: string };
    if (error.code === "22P02") {
      return reply.code(400).send({ error: "invalid_request" });
    }
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err }, "request failed");
      return reply.code(500).send({ error: "internal" });
    }
    return reply.code(statusCode).send({ error: error.message || "error" });
  });

  await app.register(cors, {
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await registerRoutes(app);

  let boss: PgBoss | null = null;
  if (process.env.DATABASE_URL) {
    boss = new PgBoss(process.env.DATABASE_URL);
    await boss.start();
    for (const queue of ["deliver-notifications", "sunday-prompt", "purge-threads", "match-overlaps"]) {
      await boss.createQueue(queue);
    }
    await boss.schedule("deliver-notifications", "*/5 * * * *", {}, { tz: "UTC" });
    await boss.schedule("sunday-prompt", "*/15 * * * *", {}, { tz: "UTC" });
    await boss.schedule("purge-threads", "20 * * * *", {}, { tz: "UTC" });
    await boss.schedule("match-overlaps", "*/15 * * * *", {}, { tz: "UTC" });
    await boss.work("deliver-notifications", deliverPendingNotifications);
    await boss.work("sunday-prompt", queueSundayPrompts);
    await boss.work("purge-threads", purgeExpiredThreads);
    await boss.work("match-overlaps", runMatchingSweep);
  }

  const close = async () => {
    await app.close();
    if (boss) await boss.stop();
    await pool.end();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);

  if (getDevAuthCode()) {
    app.log.warn("DEV_AUTH_CODE is active; one-time codes are not emailed");
  }

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
