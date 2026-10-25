import { config } from "./config.ts";
import { logger } from "./logger.ts";
import { createApp } from "./app.ts";

const server = createApp().listen(config.PORT, () => {
  logger.info(`gateway listening on :${config.PORT}`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
