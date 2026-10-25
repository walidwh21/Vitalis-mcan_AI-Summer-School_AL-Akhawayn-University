import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartHandshake, History, Plus, Send, Square, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/api";
import { CONVERSATIONS_KEY, useChat } from "./useChat";

const FEELINGS: { value: string; label: MessageKey }[] = [
  { value: "good", label: "assistant.feeling.good" },
  { value: "neutral", label: "assistant.feeling.neutral" },
  { value: "low", label: "assistant.feeling.low" },
];

const HABIT_PREF_KEY = "vitalis.chat.useHabitData";

export function AssistantPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const chat = useChat();
  const [draft, setDraft] = useState("");
  const [feeling, setFeeling] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [useHabitData, setUseHabitData] = useState(() => localStorage.getItem(HABIT_PREF_KEY) === "true");
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: async () => (await api<{ conversations: Conversation[] }>("/chat/conversations")).conversations,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/chat/conversations/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      if (id === chat.conversationId) chat.reset();
      return queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages]);

  const toggleHabitData = (next: boolean) => {
    setUseHabitData(next);
    localStorage.setItem(HABIT_PREF_KEY, String(next));
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || chat.streaming) return;
    setDraft("");
    void chat.send(content, {
      mood: feeling ?? undefined,
      locale,
      useHabitData,
      fallbackError: t("assistant.error.generic"),
    });
    setFeeling(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t("assistant.title")}</h1>
          <p className="text-muted-foreground">{t("assistant.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="md:hidden" onClick={() => setShowHistory((v) => !v)}>
          <History size={16} />
          {t("assistant.history")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[250px_1fr]">
        <aside className={cn("space-y-2", showHistory ? "block" : "hidden md:block")}>
          <Button variant="outline" className="w-full" onClick={() => { chat.reset(); setShowHistory(false); }}>
            <Plus size={16} />
            {t("assistant.newChat")}
          </Button>
          {conversations.data?.length === 0 && <p className="px-1 py-3 text-xs text-muted-foreground">{t("assistant.noHistory")}</p>}
          <ul className="space-y-1">
            {conversations.data?.map((c) => (
              <li key={c.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => { void chat.open(c.id); setShowHistory(false); }}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent",
                    c.id === chat.conversationId && "bg-accent font-medium",
                  )}
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  aria-label={t("assistant.delete")}
                  onClick={() => remove.mutate(c.id)}
                  className="rounded p-1.5 text-muted-foreground opacity-0 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <Card className="flex h-[calc(100vh-15rem)] min-h-[28rem] flex-col overflow-hidden">
          {chat.crisis && (
            <div role="alert" className="flex gap-3 border-b bg-destructive/10 p-4 text-sm">
              <HeartHandshake className="mt-0.5 shrink-0 text-destructive" size={20} />
              <div>
                <p className="font-semibold">{t("assistant.crisis.title")}</p>
                <p className="mt-0.5 text-foreground/80">{t("assistant.crisis.body")}</p>
                <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="mt-1 inline-block font-medium text-primary underline">
                  {t("assistant.crisis.link")}
                </a>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {chat.messages.length === 0 && <Bubble role="assistant">{t("assistant.greeting")}</Bubble>}
            {chat.messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <Bubble role={m.role}>{m.content || (m.pending ? "…" : "")}</Bubble>
                {m.role === "assistant" && !m.pending && !m.id.startsWith("tmp-") && (
                  <div className="mt-1 flex gap-1">
                    {(["helpful", "not_helpful"] as const).map((v) => (
                      <Button
                        key={v}
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-2 text-xs", m.feedback === v && "bg-accent text-accent-foreground")}
                        onClick={() => void chat.rate(m.id, v)}
                      >
                        {v === "helpful" ? <ThumbsUp size={13} /> : <ThumbsDown size={13} />}
                        {t(v === "helpful" ? "assistant.helpful" : "assistant.notHelpful")}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chat.error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {chat.error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="space-y-3 border-t bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("assistant.feeling")}</span>
              {FEELINGS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={feeling === f.value}
                  onClick={() => setFeeling(feeling === f.value ? null : f.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    feeling === f.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  {t(f.label)}
                </button>
              ))}
              <label className="ms-auto flex items-center gap-2 text-xs" title={t("assistant.useHabitData.hint")}>
                <Switch checked={useHabitData} onCheckedChange={toggleHabitData} label={t("assistant.useHabitData")} />
                {t("assistant.useHabitData")}
              </label>
            </div>

            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                rows={1}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("assistant.placeholder")}
                aria-label={t("assistant.placeholder")}
                className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
              {chat.streaming ? (
                <Button type="button" variant="outline" size="icon" aria-label={t("assistant.stop")} onClick={chat.stop}>
                  <Square size={16} />
                </Button>
              ) : (
                <Button type="submit" size="icon" aria-label={t("assistant.send")} disabled={!draft.trim()}>
                  <Send size={16} className="rtl:-scale-x-100" />
                </Button>
              )}
            </form>
            <p className="text-[11px] text-muted-foreground">{t("assistant.disclaimer")}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      {children}
    </div>
  );
}
