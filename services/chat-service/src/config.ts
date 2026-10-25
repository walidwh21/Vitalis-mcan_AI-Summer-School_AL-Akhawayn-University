import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().default(4003),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  INTERNAL_API_KEY: z.string().min(16, "INTERNAL_API_KEY must be at least 16 characters"),
  HABITS_SERVICE_URL: z.string().url().default("http://habits-service:4002"),

  AI_PROVIDER: z.enum(["anthropic", "openai", "mock"]).default("anthropic"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_BASE_URL: z.string().url().optional(),
  AI_MAX_TOKENS: z.coerce.number().int().min(64).max(4096).default(600),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60_000),

  HISTORY_MAX_MESSAGES: z.coerce.number().int().min(2).max(100).default(20),
  HISTORY_MAX_CHARS: z.coerce.number().int().min(500).default(12_000),
  MESSAGES_PER_MINUTE: z.coerce.number().int().min(1).default(12),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`[chat-service] invalid configuration: ${issue.path.join(".")} - ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
