export type Locale = "en" | "fr" | "ar";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StreamRequest {
  system: string;
  messages: ChatTurn[];
  locale: Locale;
  signal?: AbortSignal;
}

/** A chat backend. Implementations yield plain text chunks as they arrive. */
export interface AiProvider {
  readonly name: string;
  stream(request: StreamRequest): AsyncGenerator<string>;
}

export class AiError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}
