export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ChatTopic {
  slug: string;
  titulo: string;
  categoria: string;
}

export interface ChatFetchInit {
  method: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export interface ChatFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type ChatFetch = (
  input: string,
  init: ChatFetchInit,
) => Promise<ChatFetchResponse>;

export interface ChatClientConfig {
  baseUrl?: string;
  fetchImpl?: ChatFetch;
  timeoutMs?: number;
}

export interface ChatRequestOptions {
  signal?: AbortSignal;
}

export class ChatRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ChatRequestError";
    this.status = status;
  }
}
