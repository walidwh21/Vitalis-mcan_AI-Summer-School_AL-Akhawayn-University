import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { api, apiStream, ApiError } from "@/lib/api";
import { todayISO } from "@/lib/dates";
import { readSse } from "@/lib/sse";
import type { ChatMessage, Conversation, Locale } from "@/types/api";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback: ChatMessage["feedback"];
  pending?: boolean;
}

export const CONVERSATIONS_KEY = ["chat", "conversations"] as const;

interface SendOptions {
  mood?: string;
  locale: Locale;
  useHabitData: boolean;
  fallbackError: string;
}

/** Owns the open conversation and consumes the streamed assistant reply. */
export function useChat() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setError(null);
    setCrisis(false);
    setStreaming(false);
  }, []);

  const open = useCallback(async (id: string) => {
    abortRef.current?.abort();
    setStreaming(false);
    setError(null);
    setCrisis(false);
    setConversationId(id);
    const res = await api<{ messages: ChatMessage[] }>(`/chat/conversations/${id}/messages`);
    setMessages(res.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, feedback: m.feedback })));
  }, []);

  const send = useCallback(
    async (content: string, { mood, locale, useHabitData, fallbackError }: SendOptions) => {
      setError(null);
      setCrisis(false);
      const controller = new AbortController();
      abortRef.current = controller;
      const stamp = Date.now();
      const userTempId = `tmp-user-${stamp}`;
      const aiTempId = `tmp-ai-${stamp}`;

      try {
        let id = conversationId;
        if (!id) {
          id = (await api<{ conversation: Conversation }>("/chat/conversations", { method: "POST", body: {} })).conversation.id;
          setConversationId(id);
        }
        setMessages((m) => [
          ...m,
          { id: userTempId, role: "user", content, feedback: null },
          { id: aiTempId, role: "assistant", content: "", feedback: null, pending: true },
        ]);
        setStreaming(true);

        const res = await apiStream(
          `/chat/conversations/${id}/messages`,
          { content, mood, locale, useHabitData, today: todayISO() },
          controller.signal,
        );

        const rename = (from: string, to: string) =>
          setMessages((m) => m.map((x) => (x.id === from ? { ...x, id: to } : x)));

        for await (const event of readSse(res.body as ReadableStream<Uint8Array>)) {
          const data = JSON.parse(event.data) as { id?: string; text?: string; message?: string };
          if (event.event === "user" && data.id) rename(userTempId, data.id);
          else if (event.event === "safety") setCrisis(true);
          else if (event.event === "delta" && data.text) {
            setMessages((m) => m.map((x) => (x.id === aiTempId ? { ...x, content: x.content + data.text } : x)));
          } else if (event.event === "done" && data.id) rename(aiTempId, data.id);
          else if (event.event === "error") setError(data.message ?? fallbackError);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof ApiError ? err.message : fallbackError);
      } finally {
        setStreaming(false);
        // Drop an empty placeholder (failed reply) and clear the "typing" state.
        setMessages((m) => m.filter((x) => !(x.pending && !x.content)).map((x) => ({ ...x, pending: false })));
        void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      }
    },
    [conversationId, queryClient],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const rate = useCallback(async (messageId: string, value: "helpful" | "not_helpful") => {
    setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, feedback: value } : x)));
    try {
      await api(`/chat/messages/${messageId}/feedback`, { method: "PUT", body: { value } });
    } catch {
      setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, feedback: null } : x)));
    }
  }, []);

  return { conversationId, messages, streaming, error, crisis, open, reset, send, stop, rate };
}
