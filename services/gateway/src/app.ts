import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import { pinoHttp } from "pino-http";
import { requireToken } from "./auth.ts";
import { config } from "./config.ts";
import { logger } from "./logger.ts";

const SERVICES = {
  auth: config.AUTH_SERVICE_URL,
  habits: config.HABITS_SERVICE_URL,
  chat: config.CHAT_SERVICE_URL,
} as const;

function proxyTo(prefix: string, target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter: prefix,
    pathRewrite: { [`^${prefix}`]: "" },
    proxyTimeout: 120_000, // long enough for streamed AI replies
    on: {
      error: (err, _req, res) => {
        logger.error({ err, target }, "upstream error");
        if ("writeHead" in res && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "bad_gateway", message: "Service temporarily unavailable" }));
        }
      },
    },
  });
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY ? 1 : false);

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGINS.split(",").map((o) => o.trim()),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/healthz" } }));

  // Liveness for the gateway itself, and an aggregated readiness view of the services.
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", service: "gateway" });
  });

  app.get("/api/health", async (_req: Request, res: Response) => {
    const entries = await Promise.all(
      Object.entries(SERVICES).map(async ([name, url]) => {
        try {
          const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
          return [name, r.ok ? "up" : "down"] as const;
        } catch {
          return [name, "down"] as const;
        }
      }),
    );
    const services = Object.fromEntries(entries);
    const healthy = Object.values(services).every((s) => s === "up");
    res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", services });
  });

  const common = { standardHeaders: true, legacyHeaders: false } as const;
  app.use("/api", rateLimit({ ...common, windowMs: 60_000, limit: config.RATE_LIMIT_PER_MINUTE }));

  // Credential endpoints get a much tighter budget to slow down brute-force attempts.
  const credentialLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60_000,
    limit: 20,
    message: { error: "rate_limited", message: "Too many attempts. Please try again later." },
  });
  app.use("/api/auth/login", credentialLimiter);
  app.use("/api/auth/register", credentialLimiter);

  // Everything except /api/auth requires a token. /api/auth/me verifies it in the auth service.
  app.use("/api/habits", requireToken);
  app.use("/api/chat", requireToken);

  // Proxies stream request/response bodies untouched, so no body parser is mounted here.
  app.use(proxyTo("/api/auth", SERVICES.auth));
  app.use(proxyTo("/api/habits", SERVICES.habits));
  app.use(proxyTo("/api/chat", SERVICES.chat));

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Route not found" });
  });
  return app;
}
