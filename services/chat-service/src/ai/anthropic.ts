import { decodeAnthropicEvent } from "./deltas.ts";
import { parseSse } from "./sse.ts";
import { AiError } from "./types.ts";
import type { AiProvider, StreamRequest } from "./types.ts";

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  timeoutMs: number;
}

/** Streams completions from the Anthropic Messages API using plain `fetch`. */
export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private readonly options: AnthropicOptions;

  constructor(options: AnthropicOptions) {
    this.options = options;
  }

  async *stream({ system, messages, signal }: StreamRequest): AsyncGenerator<string> {
    const { apiKey, model, baseUrl, maxTokens, timeoutMs } = this.options;
    const timeout = AbortSignal.timeout(timeoutMs);
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, stream: true }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });

    if (!res.ok || !res.body) {
      throw new AiError(`Anthropic request failed (${res.status}): ${(await res.text()).slice(0, 300)}`, res.status);
    }

    for await (const ev of parseSse(res.body)) {
      const decoded = decodeAnthropicEvent(ev);
      if (!decoded) continue;
      if ("text" in decoded) yield decoded.text;
      else if ("error" in decoded) throw new AiError(decoded.error);
      else return;
    }
  }
}
