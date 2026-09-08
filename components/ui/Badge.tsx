import type { ReactNode } from "react";

type BadgeVariant = "accent" | "emerald" | "muted";

type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  accent: "border-amber-400/30 bg-amber-400/10 text-accent-text",
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-text",
  muted: "border-border bg-surface-strong text-muted",
};

export default function Badge({
  variant = "accent",
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}