import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().default(4002),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  INTERNAL_API_KEY: z.string().min(16, "INTERNAL_API_KEY must be at least 16 characters"),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`[habits-service] invalid configuration: ${issue.path.join(".")} - ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
