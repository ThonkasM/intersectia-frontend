import Image from "next/image";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/theme/ThemeToggle";

const links = [
  { href: "#iot", label: "IoT" },
  { href: "#autonomos", label: "Autónomos" },
  { href: "#relacion", label: "Relación" },
  { href: "#teoria", label: "Teoría" },
  { href: "#caso", label: "Caso de estudio" },
  { href: "#demo", label: "Demo" },
];

function Logo() {
  return (
    <Image
      src="/intersectia-mark.png"
      alt=""
      width={32}
      height={32}
      priority
      className="size-8"
    />
  );
}

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#inicio" className="flex items-center gap-3">
          <Logo />
          <span className="font-semibold tracking-tight text-foreground">
            Intersect<span className="text-accent">IA</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button href="/demo" variant="primary" size="md">
            Abrir demostración
          </Button>
        </div>
      </div>
    </header>
  );
}