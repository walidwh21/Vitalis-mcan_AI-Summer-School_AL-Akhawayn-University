import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSse } from "./ai/sse.ts";
import { decodeAnthropicEvent, decodeOpenAiEvent } from "./ai/deltas.ts";
import { MockProvider } from "./ai/mock.ts";
import { detectCrisis } from "./lib/safety.ts";
import { buildSystemPrompt, formatHabitContext } from "./lib/prompt.ts";
import type { HabitSummary } from "./lib/prompt.ts";
import { prepareHistory, titleFrom } from "./lib/history.ts";
import { createRateLimiter } from "./lib/rateLimiter.ts";

const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

test("parseSse reassembles frames split across chunks", async () => {
  const events = await collect(
    parseSse(streamOf('event: content_block_delta\nda', 'ta: {"a":1}\n\nevent: message_stop\n', "data: {}\n\n")),
  );
  assert.deepEqual(events, [
    { event: "content_block_delta", data: '{"a":1}' },
    { event: "message_stop", data: "{}" },
  ]);
});

test("parseSse handles CRLF, comments and multi-line data", async () => {
  const events = await collect(parseSse(streamOf(": ping\r\n\r\ndata: one\r\ndata: two\r\n\r\n")));
  assert.deepEqual(events, [{ event: undefined, data: "one\ntwo" }]);
});

test("parseSse flushes a final frame without trailing blank line", async () => {
  const events = await collect(parseSse(streamOf("data: [DONE]")));
  assert.deepEqual(events, [{ event: undefined, data: "[DONE]" }]);
});

test("decodeAnthropicEvent extracts text deltas and ignores other events", () => {
  const delta = JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } });
  assert.deepEqual(decodeAnthropicEvent({ event: "content_block_delta", data: delta }), { text: "Hi" });
  assert.equal(decodeAnthropicEvent({ event: "ping", data: "{}" }), null);
  assert.deepEqual(decodeAnthropicEvent({ event: "message_stop", data: "{}" }), { done: true });
  const err = JSON.stringify({ error: { type: "overloaded_error", message: "Overloaded" } });
  assert.deepEqual(decodeAnthropicEvent({ event: "error", data: err }), { error: "Overloaded" });
  assert.equal(decodeAnthropicEvent({ event: "content_block_delta", data: "not json" }), null);
});

test("decodeOpenAiEvent extracts content and the DONE sentinel", () => {
  const chunk = JSON.stringify({ choices: [{ delta: { content: "Hello" } }] });
  assert.deepEqual(decodeOpenAiEvent({ event: undefined, data: chunk }), { text: "Hello" });
  assert.deepEqual(decodeOpenAiEvent({ event: undefined, data: "[DONE]" }), { done: true });
  const empty = JSON.stringify({ choices: [{ delta: { role: "assistant" } }] });
  assert.equal(decodeOpenAiEvent({ event: undefined, data: empty }), null);
});

test("detectCrisis flags crisis language in en/fr/ar and ignores idioms", () => {
  assert.equal(detectCrisis("I want to die"), true);
  assert.equal(detectCrisis("I don’t want to be here anymore"), true);
  assert.equal(detectCrisis("j'ai envie de mourir"), true);
  assert.equal(detectCrisis("أفكر في الانتحار"), true);
  assert.equal(detectCrisis("this deadline is killing me"), false);
  assert.equal(detectCrisis("I slept badly and feel tired"), false);
});

const habit: HabitSummary = {
  windowDays: 7,
  loggedDays: 5,
  averages: { waterGlasses: 6.2, sleepHours: 6.5, activityMinutes: 35 },
  moodCounts: { good: 3, low: 1, great: 0 },
  goals: { waterGlasses: 8, sleepHours: 8, activityMinutes: 60 },
  streak: 2,
  today: null,
};

test("buildSystemPrompt includes language, mood and habit context only when relevant", () => {
  const prompt = buildSystemPrompt({ locale: "fr", mood: "tired", habit, crisis: false });
  assert.match(prompt, /Reply in French/);
  assert.match(prompt, /feeling: tired/);
  assert.match(prompt, /<habit_summary>/);
  assert.match(prompt, /Moods this week: good x3, low x1/);
  assert.doesNotMatch(prompt, /harming themselves/);

  const bare = buildSystemPrompt({ locale: "en", habit: { ...habit, loggedDays: 0 }, crisis: false });
  assert.doesNotMatch(bare, /habit_summary/);
});

test("buildSystemPrompt adds the crisis protocol when flagged", () => {
  const prompt = buildSystemPrompt({ locale: "en", crisis: true });
  assert.match(prompt, /emergency services or a crisis line/);
  assert.match(prompt, /Do not provide methods/);
});

test("formatHabitContext reports today's values when present", () => {
  const text = formatHabitContext({
    ...habit,
    today: { mood: "good", waterGlasses: 3, sleepHours: 7, activityMinutes: 10 },
  });
  assert.match(text, /Today so far: water 3, sleep 7 h, activity 10 min, mood good/);
});

test("prepareHistory keeps newest messages within budget and starts on a user turn", () => {
  const msgs = [
    { role: "user" as const, content: "a".repeat(50) },
    { role: "assistant" as const, content: "b".repeat(50) },
    { role: "user" as const, content: "c".repeat(50) },
    { role: "assistant" as const, content: "d".repeat(50) },
    { role: "user" as const, content: "e".repeat(50) },
  ];
  const trimmed = prepareHistory(msgs, 120);
  assert.deepEqual(trimmed.map((m) => m.content[0]), ["e"]);
  const wider = prepareHistory(msgs, 160);
  assert.equal(wider[0]?.role, "user");
  assert.equal(wider.at(-1)?.content[0], "e");
});

test("prepareHistory always keeps the last message even if it exceeds the budget", () => {
  const trimmed = prepareHistory([{ role: "user", content: "x".repeat(500) }], 10);
  assert.equal(trimmed.length, 1);
});

test("titleFrom collapses whitespace and truncates", () => {
  assert.equal(titleFrom("  hello \n  world "), "hello world");
  const long = titleFrom("word ".repeat(30));
  assert.ok(long.length <= 48);
  assert.ok(long.endsWith("…"));
});

test("rate limiter allows up to max per window, then recovers", () => {
  let t = 0;
  const limiter = createRateLimiter(2, 1000, () => t);
  assert.equal(limiter.take("u1"), true);
  assert.equal(limiter.take("u1"), true);
  assert.equal(limiter.take("u1"), false);
  assert.equal(limiter.take("u2"), true); // separate key
  t = 1001;
  assert.equal(limiter.take("u1"), true);
});

test("MockProvider streams a locale-appropriate reply and respects abort", async () => {
  const mock = new MockProvider(0);
  const chunks = await collect(
    mock.stream({ system: "", locale: "fr", messages: [{ role: "user", content: "je suis triste" }] }),
  );
  assert.match(chunks.join(""), /désolé/);

  const controller = new AbortController();
  controller.abort();
  const none = await collect(
    mock.stream({ system: "", locale: "en", messages: [{ role: "user", content: "hi" }], signal: controller.signal }),
  );
  assert.equal(none.length, 0);
});
