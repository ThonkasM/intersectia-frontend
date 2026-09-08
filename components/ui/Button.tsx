import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "outline";
type ButtonSize = "md" | "lg";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type ButtonProps = ButtonBaseProps &
  (
    | { href: string }
    | {
        href?: undefined;
        type?: "button" | "submit" | "reset";
        disabled?: boolean;
        onClick?: () => void;
      }
  );

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-amber-500/90 text-black hover:bg-amber-400",
  outline: "border border-border-strong text-foreground hover:border-foreground/50",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className = "",
    children,
  } = props;

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (typeof props.href === "string") {
    if (props.href.startsWith("#")) {
      return (
        <a href={props.href} className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", disabled, onClick } = props;

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}