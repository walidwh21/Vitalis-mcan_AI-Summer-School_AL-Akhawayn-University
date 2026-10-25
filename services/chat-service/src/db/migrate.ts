import { pool } from "./pool.ts";

const LOCK_ID = 727_103;

const SQL = `
CREATE SCHEMA IF NOT EXISTS chat_svc;

CREATE TABLE IF NOT EXISTS chat_svc.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  title      TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_updated_idx
  ON chat_svc.conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_svc.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq             BIGSERIAL NOT NULL,
  conversation_id UUID NOT NULL REFERENCES chat_svc.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  feedback        TEXT CHECK (feedback IN ('helpful','not_helpful')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_seq_idx
  ON chat_svc.messages (conversation_id, seq);
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
