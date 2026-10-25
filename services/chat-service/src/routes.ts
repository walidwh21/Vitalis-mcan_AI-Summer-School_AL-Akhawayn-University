import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { config } from "./config.ts";
import { logger } from "./logger.ts";
import { asyncHandler, HttpError } from "./http.ts";
import { requireAuth } from "./middleware.ts";
import { createProvider } from "./ai/index.ts";
import { buildSystemPrompt } from "./lib/prompt.ts";
import { detectCrisis } from "./lib/safety.ts";
import { prepareHistory, titleFrom } from "./lib/history.ts";
import { createRateLimiter } from "./lib/rateLimiter.ts";
import { fetchHabitSummary } from "./habitsClient.ts";
import {
  addMessage,
  createConversation,
  DEFAULT_TITLE,
  deleteConversation,
  getConversation,
  listConversations,
  listMessages,
  recentTurns,
  renameConversation,
  setFeedback,
} from "./db/repository.ts";

const provider = createProvider(config, (msg) => logger.warn(msg));
logger.info({ provider: provider.name }, "AI provider ready");

const limiter = createRateLimiter(config.MESSAGES_PER_MINUTE, 60_000);

const uuid = z.string().uuid();
const createBody = z.object({ title: z.string().trim().min(1).max(80).optional() });
const sendBody = z.object({
  content: z.string().trim().min(1).max(2000),
  mood: z.string().trim().max(40).optional(),
  locale: z.enum(["en", "fr", "ar"]).default("en"),
  useHabitData: z.boolean().default(false),
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
const feedbackBody = z.object({ value: z.enum(["helpful", "not_helpful"]) });

function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const router = Router();
router.use(requireAuth);

router.get(
  "/conversations",
  asyncHandler(async (_req, res) => {
    res.json({ conversations: await listConversations(res.locals.userId) });
  }),
);

router.post(
  "/conversations",
  asyncHandler(async (req, res) => {
    const { title } = createBody.parse(req.body ?? {});
    res.status(201).json({ conversation: await createConversation(res.locals.userId, title) });
  }),
);

router.get(
  "/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const id = uuid.parse(req.params.id);
    if (!(await getConversation(res.locals.userId, id))) throw new HttpError(404, "Conversation not found");
    res.json({ messages: await listMessages(id) });
  }),
);

router.delete(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const removed = await deleteConversation(res.locals.userId, uuid.parse(req.params.id));
    if (!removed) throw new HttpError(404, "Conversation not found");
    res.status(204).end();
  }),
);

router.put(
  "/messages/:id/feedback",
  asyncHandler(async (req, res) => {
    const { value } = feedbackBody.parse(req.body);
    const ok = await setFeedback(res.locals.userId, uuid.parse(req.params.id), value);
    if (!ok) throw new HttpError(404, "Message not found");
    res.status(204).end();
  }),
);

/**
 * Sends a user message and streams the assistant's reply as Server-Sent Events:
 *   user   {id}      the stored user message
 *   safety {level}   emitted when the message may signal a crisis
 *   delta  {text}    a chunk of the reply
 *   done   {id}      the stored assistant message
 *   error  {message} the reply could not be completed
 */
router.post(
  "/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const userId = res.locals.userId as string;
    const conversationId = uuid.parse(req.params.id);
    const body = sendBody.parse(req.body);

    const conversation = await getConversation(userId, conversationId);
    if (!conversation) throw new HttpError(404, "Conversation not found");
    if (!limiter.take(userId)) throw new HttpError(429, "You're sending messages too quickly. Please wait a moment.");

    const userMessage = await addMessage(conversationId, "user", body.content);
    if (conversation.title === DEFAULT_TITLE) await renameConversation(conversationId, titleFrom(body.content));

    const crisis = detectCrisis(body.content);
    const [turns, habit] = await Promise.all([
      recentTurns(conversationId, config.HISTORY_MAX_MESSAGES),
      body.useHabitData ? fetchHabitSummary(userId, body.today) : Promise.resolve(null),
    ]);
    const system = buildSystemPrompt({ locale: body.locale, mood: body.mood, habit, crisis });

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    sendEvent(res, "user", { id: userMessage.id });
    if (crisis) sendEvent(res, "safety", { level: "crisis" });

    const abort = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) abort.abort();
    });

    let reply = "";
    let failed = false;
    try {
      const stream = provider.stream({
        system,
        locale: body.locale,
        messages: prepareHistory(turns, config.HISTORY_MAX_CHARS),
        signal: abort.signal,
      });
      for await (const text of stream) {
        reply += text;
        sendEvent(res, "delta", { text });
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        failed = true;
        logger.error({ err, provider: provider.name }, "AI stream failed");
        sendEvent(res, "error", { message: "The assistant is unavailable right now. Please try again." });
      }
    }

    // Keep whatever was generated, even if the client left mid-reply.
    if (reply.trim()) {
      const saved = await addMessage(conversationId, "assistant", reply);
      if (!failed && !abort.signal.aborted) sendEvent(res, "done", { id: saved.id });
    }
    res.end();
  }),
);
