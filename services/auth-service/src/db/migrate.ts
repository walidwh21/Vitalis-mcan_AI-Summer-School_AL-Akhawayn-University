import { pool } from "./pool.ts";

const LOCK_ID = 727_101;

const SQL = `
CREATE SCHEMA IF NOT EXISTS auth_svc;

CREATE TABLE IF NOT EXISTS auth_svc.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  locale        TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en','fr','ar')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON auth_svc.users (lower(email));
`;

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(SQL);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => undefined);
    client.release();
  }
}
