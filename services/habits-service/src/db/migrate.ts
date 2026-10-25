import { pool } from "./pool.ts";

const LOCK_ID = 727_102; // arbitrary, unique per service so concurrent boots don't race

const SQL = `
CREATE SCHEMA IF NOT EXISTS habits_svc;

CREATE TABLE IF NOT EXISTS habits_svc.entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  entry_date       DATE NOT NULL,
  mood             TEXT CHECK (mood IN ('very_low','low','neutral','good','great')),
  water_glasses    INTEGER NOT NULL DEFAULT 0 CHECK (water_glasses BETWEEN 0 AND 30),
  sleep_hours      NUMERIC(3,1) NOT NULL DEFAULT 0 CHECK (sleep_hours BETWEEN 0 AND 24),
  activity_minutes INTEGER NOT NULL DEFAULT 0 CHECK (activity_minutes BETWEEN 0 AND 600),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS entries_user_date_idx
  ON habits_svc.entries (user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS habits_svc.goals (
  user_id          UUID PRIMARY KEY,
  water_glasses    INTEGER NOT NULL DEFAULT 8  CHECK (water_glasses BETWEEN 1 AND 30),
  sleep_hours      NUMERIC(3,1) NOT NULL DEFAULT 8 CHECK (sleep_hours BETWEEN 1 AND 16),
  activity_minutes INTEGER NOT NULL DEFAULT 60 CHECK (activity_minutes BETWEEN 5 AND 600),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
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
