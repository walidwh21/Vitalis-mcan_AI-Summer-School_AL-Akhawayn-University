import type { ChatTurn } from "../ai/types.ts";

/**
 * Keeps the newest messages that fit within `maxChars` (always at least the last one)
 * and makes sure the conversation starts with a user turn, as providers require.
 */
export function prepareHistory(messages: ChatTurn[], maxChars: number): ChatTurn[] {
  const kept: ChatTurn[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as ChatTurn;
    if (kept.length > 0 && total + message.content.length > maxChars) break;
    kept.unshift(message);
    total += message.content.length;
  }
  while (kept.length > 1 && kept[0]?.role !== "user") kept.shift();
  return kept;
}

export function titleFrom(content: string, max = 48): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
