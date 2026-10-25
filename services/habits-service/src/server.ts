import { config } from "./config.ts";
import { logger } from "./logger.ts";
import { pool } from "./db/pool.ts";
import { migrate } from "./db/migrate.ts";
import { createApp } from "./app.ts";

await migrate();
const server = createApp().listen(config.PORT, () => {
  logger.info(`habits-service listening on :${config.PORT}`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
