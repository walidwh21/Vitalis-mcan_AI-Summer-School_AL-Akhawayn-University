import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().default(4001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`[auth-service] invalid configuration: ${issue.path.join(".")} - ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
