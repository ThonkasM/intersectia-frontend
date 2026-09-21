import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createChatClient, type ChatClient } from "@/lib/chat/client";
import type { ChatMessage, ChatTopic } from "@/lib/chat/types";

const DEFAULT_ERROR_TEXT =
  "No pude contactar al asistente. Asegúrate de que el backend esté corriendo.";

export interface UseChatOptions {
  baseUrl?: string;
  sessionId: string;
  initialMessages?: ChatMessage[];
  client?: ChatClient;
  errorText?: string;
  fallbackText?: string;
  loadTopics?: boolean;
}

export function useChat(options: UseChatOptions) {
  const {
    baseUrl,
    sessionId,
    initialMessages,
    errorText = DEFAULT_ERROR_TEXT,
    fallbackText = "Sin respuesta.",
    loadTopics = true,
  } = options;

  const client = useMemo(
    () => options.client ?? createChatClient({ baseUrl }),
    [options.client, baseUrl],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages ?? [],
  );
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loadTopics) return;
    const controller = new AbortController();
    client
      .getTopics({ signal: controller.signal })
      .then(setTopics)
      .catch(() => undefined);
    return () => controller.abort();
  }, [client, loadTopics]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setMessages((prev) => [...prev, { role: "user", text }]);
      setLoading(true);
      try {
        const answer = await client.sendMessage(text, sessionId, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: answer || fallbackText },
        ]);
      } catch {
        if (controller.signal.aborted) return;
        setMessages((prev) => [...prev, { role: "assistant", text: errorText }]);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [client, sessionId, fallbackText, errorText],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages(initialMessages ?? []);
    setLoading(false);
  }, [initialMessages]);

  return { messages, topics, loading, send, reset };
}
