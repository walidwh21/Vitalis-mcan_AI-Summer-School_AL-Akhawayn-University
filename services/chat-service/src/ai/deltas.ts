import type { SseEvent } from "./sse.ts";

/** Result of decoding one provider event: text to emit, a terminal signal, or nothing. */
export type Decoded = { text: string } | { done: true } | { error: string } | null;

export function decodeAnthropicEvent(ev: SseEvent): Decoded {
  switch (ev.event) {
    case "content_block_delta": {
      const payload = safeJson(ev.data);
      const delta = payload?.delta;
      return delta?.type === "text_delta" && typeof delta.text === "string" && delta.text
        ? { text: delta.text }
        : null;
    }
    case "message_stop":
      return { done: true };
    case "error": {
      const payload = safeJson(ev.data);
      return { error: String(payload?.error?.message ?? "Provider reported an error") };
    }
    default:
      return null; // ping, message_start, content_block_start/stop, message_delta
  }
}

export function decodeOpenAiEvent(ev: SseEvent): Decoded {
  if (ev.data === "[DONE]") return { done: true };
  const payload = safeJson(ev.data);
  if (payload?.error) return { error: String(payload.error.message ?? "Provider reported an error") };
  const text = payload?.choices?.[0]?.delta?.content;
  return typeof text === "string" && text ? { text } : null;
}

function safeJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
