export const CHAT_SESSION_KEY = "intersectia-chat-session";

export interface SyncSessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createSessionId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function resolveSessionId(
  store: SyncSessionStore,
  key: string = CHAT_SESSION_KEY,
): string {
  const existing = store.getItem(key);
  if (existing) return existing;
  const id = createSessionId();
  store.setItem(key, id);
  return id;
}
