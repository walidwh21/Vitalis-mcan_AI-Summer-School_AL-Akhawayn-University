import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./logger.ts";
import { errorHandler } from "./http.ts";
import { pool } from "./db/pool.ts";
import { router } from "./routes.ts";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "50kb" }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", service: "habits-service" });
    } catch {
      res.status(503).json({ status: "degraded", service: "habits-service" });
    }
  });

  app.use(router);
  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Route not found" });
  });
  app.use(errorHandler);
  return app;
}
