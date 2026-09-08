const footerLinks = [
  { href: "#iot", label: "IoT" },
  { href: "#autonomos", label: "Autónomos" },
  { href: "#relacion", label: "Relación" },
  { href: "#caso", label: "Caso de estudio" },
  { href: "#demo", label: "Demo" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-foreground">
            Intersect<span className="text-accent">IA</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            IoT y vehículos autónomos en una intersección que se gestiona sola.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-sm text-faint">
          Proyecto académico · Ingeniería de Software II
        </p>
      </div>
    </footer>
  );
}