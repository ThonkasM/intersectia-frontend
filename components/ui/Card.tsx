import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  className?: string;
  children: ReactNode;
};

export default function Card({ title, className = "", children }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 ${className}`}
    >
      {title ? (
        <h3 className="mb-3 font-semibold text-foreground">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}