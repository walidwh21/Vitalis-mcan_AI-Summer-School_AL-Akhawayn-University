import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().default(8080),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  AUTH_SERVICE_URL: z.string().url().default("http://auth-service:4001"),
  HABITS_SERVICE_URL: z.string().url().default("http://habits-service:4002"),
  CHAT_SERVICE_URL: z.string().url().default("http://chat-service:4003"),
  /** Comma-separated list of browser origins allowed to call the API. */
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).default(300),
  /** Set to "true" when running behind a reverse proxy / load balancer. */
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`[gateway] invalid configuration: ${issue.path.join(".")} - ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
