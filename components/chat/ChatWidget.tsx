"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; text: string };

const STORAGE_KEY = "intersectia-chat-session";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "¡Hola! Soy el asistente de IntersectIA. Preguntame sobre IoT, vehículos autónomos o la demo.",
    },
  ]);
  const [sessionId] = useState<string>(getOrCreateSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/ai/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { answer?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer ?? "Sin respuesta.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "No pude contactar al asistente. Asegúrate de que el backend esté corriendo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex h-96 w-80 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Asistente IntersectIA
              </p>
              <p className="text-xs text-muted">
                IoT · Vehículos autónomos · Demo
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-full p-1 text-muted transition-colors hover:bg-surface-strong hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.map((message, index) =>
              message.role === "user" ? (
                <div
                  key={index}
                  className="ml-auto max-w-[85%] rounded-xl border border-amber-400/30 bg-amber-500/20 px-3 py-2 text-sm text-foreground"
                >
                  {message.text}
                </div>
              ) : (
                <div
                  key={index}
                  className="mr-auto max-w-[85%] rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  {message.text}
                </div>
              ),
            )}
            {loading && (
              <div className="mr-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
                <span className="animate-pulse">Escribiendo…</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
              placeholder="Escribí tu pregunta…"
              aria-label="Mensaje"
              className="flex-1 rounded-lg border border-border bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-amber-400/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              aria-label="Enviar mensaje"
              className="rounded-lg bg-amber-500 p-2 text-black transition-colors hover:bg-amber-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg transition-transform hover:scale-105 hover:bg-amber-400"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
            <path d="M12 12h.01" />
            <path d="M8 12h.01" />
            <path d="M16 12h.01" />
          </svg>
        )}
      </button>
    </>
  );
}