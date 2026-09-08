import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/theme/ThemeToggle";

const links = [
  { href: "#iot", label: "IoT" },
  { href: "#autonomos", label: "Autónomos" },
  { href: "#relacion", label: "Relación" },
  { href: "#caso", label: "Caso de estudio" },
  { href: "#demo", label: "Demo" },
];

function Logo() {
  return (
    <span
      aria-hidden
      className="relative block size-8 rotate-45 rounded-md border border-amber-400/40 bg-amber-400/10"
    >
      <span className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-amber-400" />
      <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-amber-400" />
    </span>
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