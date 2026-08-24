import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import PgBoss from "pg-boss";
import { config } from "./config.js";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import { registerRoutes } from "./routes/index.js";
import { deliverPendingNotifications, queueSundayPrompts } from "./push.js";

async function main() {
  if (process.env.RUN_MIGRATIONS === "true") {
    await migrate();
  }

  const app = Fastify({ logger: true });

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
    for (const queue of ["deliver-notifications", "sunday-prompt"]) {
      await boss.createQueue(queue);
    }
    await boss.schedule("deliver-notifications", "*/5 * * * *", {}, { tz: "UTC" });
    await boss.schedule("sunday-prompt", "0 18 * * 0", {}, { tz: "UTC" });
    await boss.work("deliver-notifications", deliverPendingNotifications);
    await boss.work("sunday-prompt", queueSundayPrompts);
  }

  const close = async () => {
    await app.close();
    if (boss) await boss.stop();
    await pool.end();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
