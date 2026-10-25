import { decodeOpenAiEvent } from "./deltas.ts";
import { parseSse } from "./sse.ts";
import { AiError } from "./types.ts";
import type { AiProvider, StreamRequest } from "./types.ts";

export interface OpenAiOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  timeoutMs: number;
}

/**
 * Streams from any OpenAI-compatible `/chat/completions` endpoint
 * (OpenAI, OpenRouter, vLLM, Ollama, LM Studio, ...).
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai";
  private readonly options: OpenAiOptions;

  constructor(options: OpenAiOptions) {
    this.options = options;
  }

  async *stream({ system, messages, signal }: StreamRequest): AsyncGenerator<string> {
    const { apiKey, model, baseUrl, maxTokens, timeoutMs } = this.options;
    const timeout = AbortSignal.timeout(timeoutMs);
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });

    if (!res.ok || !res.body) {
      throw new AiError(`Provider request failed (${res.status}): ${(await res.text()).slice(0, 300)}`, res.status);
    }

    for await (const ev of parseSse(res.body)) {
      const decoded = decodeOpenAiEvent(ev);
      if (!decoded) continue;
      if ("text" in decoded) yield decoded.text;
      else if ("error" in decoded) throw new AiError(decoded.error);
      else return;
    }
  }
}
