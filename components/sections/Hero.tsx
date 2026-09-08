import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_35%,rgba(245,166,35,0.10),transparent_70%)]" />
      <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent_80%)]" />
      <div className="absolute -left-24 top-1/4 -z-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -right-24 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <p className="font-mono text-sm tracking-[0.3em] text-accent">
          IoT × VEHÍCULOS AUTÓNOMOS
        </p>
        <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight text-foreground md:text-7xl">
          Una intersección que se gestiona sola.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          IntersectIA es una demo en vivo de cómo el IoT hace las intersecciones
          más seguras y eficientes: un nodo IoT central decide quién cruza, en
          tiempo real, y los vehículos autónomos solo ejecutan la orden.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button href="/demo" variant="primary" size="lg">
            Abrir demostración
          </Button>
          <Button href="#caso" variant="outline" size="lg">
            Ver caso de estudio
          </Button>
        </div>
        <p className="mt-12 font-mono text-sm text-faint">
          3 modos de simulación · 20 ticks/s · 1 nodo IoT central
        </p>
      </div>
    </section>
  );
}