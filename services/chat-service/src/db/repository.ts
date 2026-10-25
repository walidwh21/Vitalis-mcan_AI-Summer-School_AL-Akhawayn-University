import { pool } from "./pool.ts";
import type { ChatTurn } from "../ai/types.ts";

export const DEFAULT_TITLE = "New conversation";

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback: "helpful" | "not_helpful" | null;
  createdAt: string;
}

interface ConversationRow {
  id: string;
  title: string;
  updated_at: Date;
}

interface MessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback: "helpful" | "not_helpful" | null;
  created_at: Date;
}

const toConversation = (r: ConversationRow): Conversation => ({
  id: r.id,
  title: r.title,
  updatedAt: r.updated_at.toISOString(),
});

const toMessage = (r: MessageRow): StoredMessage => ({
  id: r.id,
  role: r.role,
  content: r.content,
  feedback: r.feedback,
  createdAt: r.created_at.toISOString(),
});

export async function listConversations(userId: string): Promise<Conversation[]> {
  const { rows } = await pool.query<ConversationRow>(
    `SELECT id, title, updated_at FROM chat_svc.conversations
     WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100`,
    [userId],
  );
  return rows.map(toConversation);
}

export async function createConversation(userId: string, title = DEFAULT_TITLE): Promise<Conversation> {
  const { rows } = await pool.query<ConversationRow>(
    `INSERT INTO chat_svc.conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, updated_at`,
    [userId, title],
  );
  return toConversation(rows[0] as ConversationRow);
}

export async function getConversation(userId: string, id: string): Promise<Conversation | null> {
  const { rows } = await pool.query<ConversationRow>(
    `SELECT id, title, updated_at FROM chat_svc.conversations WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return rows[0] ? toConversation(rows[0]) : null;
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM chat_svc.conversations WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  await pool.query(`UPDATE chat_svc.conversations SET title = $2 WHERE id = $1`, [id, title]);
}

export async function listMessages(conversationId: string): Promise<StoredMessage[]> {
  const { rows } = await pool.query<MessageRow>(
    `SELECT id, role, content, feedback, created_at FROM chat_svc.messages
     WHERE conversation_id = $1 ORDER BY seq ASC`,
    [conversationId],
  );
  return rows.map(toMessage);
}

/** The newest `limit` messages, returned oldest-first and ready to send to a model. */
export async function recentTurns(conversationId: string, limit: number): Promise<ChatTurn[]> {
  const { rows } = await pool.query<{ role: "user" | "assistant"; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, seq FROM chat_svc.messages
       WHERE conversation_id = $1 ORDER BY seq DESC LIMIT $2
     ) latest ORDER BY seq ASC`,
    [conversationId, limit],
  );
  return rows;
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
): Promise<StoredMessage> {
  const { rows } = await pool.query<MessageRow>(
    `INSERT INTO chat_svc.messages (conversation_id, role, content) VALUES ($1, $2, $3)
     RETURNING id, role, content, feedback, created_at`,
    [conversationId, role, content],
  );
  await pool.query(`UPDATE chat_svc.conversations SET updated_at = now() WHERE id = $1`, [conversationId]);
  return toMessage(rows[0] as MessageRow);
}

/** Only assistant messages in the caller's own conversations can receive feedback. */
export async function setFeedback(
  userId: string,
  messageId: string,
  value: "helpful" | "not_helpful",
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE chat_svc.messages m SET feedback = $3
     FROM chat_svc.conversations c
     WHERE m.id = $1 AND m.conversation_id = c.id AND c.user_id = $2 AND m.role = 'assistant'`,
    [messageId, userId, value],
  );
  return (rowCount ?? 0) > 0;
}
