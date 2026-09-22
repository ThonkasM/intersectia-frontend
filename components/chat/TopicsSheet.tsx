"use client";

import { useState } from "react";
import type { ChatTopic } from "@/lib/chat/types";

const CATEGORY_LABELS: Record<string, string> = {
  generales: "Generales",
  proyecto: "Proyecto",
};

const CATEGORY_ORDER = ["generales", "proyecto"];

function categoryRank(categoria: string): number {
  const index = CATEGORY_ORDER.indexOf(categoria);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function groupTopics(topics: ChatTopic[]) {
  const map = new Map<string, ChatTopic[]>();
  for (const topic of topics) {
    const key = topic.categoria?.trim() || "otros";
    const list = map.get(key);
    if (list) list.push(topic);
    else map.set(key, [topic]);
  }
  return Array.from(map, ([categoria, items]) => ({ categoria, items })).sort(
    (a, b) => categoryRank(a.categoria) - categoryRank(b.categoria),
  );
}

function TopicGroup({
  categoria,
  label,
  items,
  onSelect,
}: {
  categoria: string;
  label: string;
  items: ChatTopic[];
  onSelect: (titulo: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `topics-${categoria.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-strong"
      >
        <span className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
          {label}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs text-faint">{items.length}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-faint transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-2">
          {items.map((topic) => (
            <button
              key={topic.slug}
              type="button"
              onClick={() => onSelect(topic.titulo)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-amber-400/40"
            >
              <span>{topic.titulo}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 shrink-0 text-faint"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type TopicsSheetProps = {
  topics: ChatTopic[];
  onSelect: (titulo: string) => void;
  onClose: () => void;
};

export default function TopicsSheet({
  topics,
  onSelect,
  onClose,
}: TopicsSheetProps) {
  const groups = groupTopics(topics);

  return (
    <div className="absolute inset-0 z-10 flex flex-col rounded-2xl bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Temas</p>
          <p className="text-xs text-muted">
            Elegí una pregunta sugerida.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar temas"
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

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <p className="text-sm text-muted">No hay temas disponibles.</p>
        ) : (
          groups.map((group) => (
            <TopicGroup
              key={group.categoria}
              categoria={group.categoria}
              label={CATEGORY_LABELS[group.categoria] ?? group.categoria}
              items={group.items}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
