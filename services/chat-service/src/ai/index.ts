import { AnthropicProvider } from "./anthropic.ts";
import { MockProvider } from "./mock.ts";
import { OpenAiCompatibleProvider } from "./openai.ts";
import type { AiProvider } from "./types.ts";

export interface ProviderConfig {
  AI_PROVIDER: "anthropic" | "openai" | "mock";
  AI_API_KEY?: string | undefined;
  AI_MODEL?: string | undefined;
  AI_BASE_URL?: string | undefined;
  AI_MAX_TOKENS: number;
  AI_TIMEOUT_MS: number;
}

export const DEFAULT_MODELS = { anthropic: "claude-sonnet-5-5", openai: "gpt-4o-mini" } as const;

/**
 * Chooses the chat backend. A cloud provider without an API key falls back to the
 * offline mock (with a warning) so the stack still boots for local development.
 */
export function createProvider(cfg: ProviderConfig, warn: (msg: string) => void = () => {}): AiProvider {
  if (cfg.AI_PROVIDER === "mock") return new MockProvider();

  const needsKey = cfg.AI_PROVIDER === "anthropic" || !cfg.AI_BASE_URL; // local OpenAI-compatible servers often need none
  if (needsKey && !cfg.AI_API_KEY) {
    warn(`AI_PROVIDER=${cfg.AI_PROVIDER} but AI_API_KEY is empty; falling back to the offline mock provider`);
    return new MockProvider();
  }

  const shared = {
    apiKey: cfg.AI_API_KEY ?? "",
    maxTokens: cfg.AI_MAX_TOKENS,
    timeoutMs: cfg.AI_TIMEOUT_MS,
  };

  if (cfg.AI_PROVIDER === "anthropic") {
    return new AnthropicProvider({
      ...shared,
      model: cfg.AI_MODEL ?? DEFAULT_MODELS.anthropic,
      baseUrl: cfg.AI_BASE_URL ?? "https://api.anthropic.com",
    });
  }
  return new OpenAiCompatibleProvider({
    ...shared,
    model: cfg.AI_MODEL ?? DEFAULT_MODELS.openai,
    baseUrl: cfg.AI_BASE_URL ?? "https://api.openai.com/v1",
  });
}
