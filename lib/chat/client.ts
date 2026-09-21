import { ChatRequestError } from "./types";
import type {
  ChatClientConfig,
  ChatFetch,
  ChatRequestOptions,
  ChatTopic,
} from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const CHAT_PATH = "/ai/chat";
const TOPICS_PATH = "/ai/chat/topics";

function resolveFetch(fetchImpl?: ChatFetch): ChatFetch {
  if (fetchImpl) return fetchImpl;
  if (typeof globalThis.fetch === "function") {
    return (input, init) => globalThis.fetch(input, init);
  }
  return () => Promise.reject(new ChatRequestError("fetch no disponible"));
}

export function createChatClient(config: ChatClientConfig = {}) {
  const baseUrl = (config.baseUrl ?? "").replace(/\/+$/, "");
  const doFetch = resolveFetch(config.fetchImpl);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request(
    path: string,
    init: Omit<Parameters<ChatFetch>[1], "signal">,
    options?: ChatRequestOptions,
  ): Promise<unknown> {
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer =
      controller && timeoutMs > 0
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;
    const onAbort = () => controller?.abort();
    options?.signal?.addEventListener("abort", onAbort);
    try {
      const response = await doFetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller?.signal,
      });
      if (!response.ok) {
        throw new ChatRequestError(`HTTP ${response.status}`, response.status);
      }
      return await response.json();
    } finally {
      if (timer) clearTimeout(timer);
      options?.signal?.removeEventListener("abort", onAbort);
    }
  }

  async function sendMessage(
    message: string,
    sessionId: string,
    options?: ChatRequestOptions,
  ): Promise<string> {
    const payload = await request(
      CHAT_PATH,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId }),
      },
      options,
    );
    const answer = (payload as { answer?: unknown })?.answer;
    return typeof answer === "string" ? answer : "";
  }

  async function getTopics(options?: ChatRequestOptions): Promise<ChatTopic[]> {
    const payload = await request(TOPICS_PATH, { method: "GET" }, options);
    const topics = (payload as { topics?: unknown })?.topics;
    if (!Array.isArray(topics)) return [];
    return topics.flatMap((topic): ChatTopic[] => {
      if (typeof topic !== "object" || topic === null) return [];
      const { slug, titulo, categoria } = topic as Record<string, unknown>;
      if (typeof slug !== "string" || typeof titulo !== "string") return [];
      return [
        {
          slug,
          titulo,
          categoria: typeof categoria === "string" ? categoria : "",
        },
      ];
    });
  }

  return { sendMessage, getTopics };
}

export type ChatClient = ReturnType<typeof createChatClient>;
