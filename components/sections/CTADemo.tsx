import Button from "@/components/ui/Button";

export default function CTADemo() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-transparent p-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          ¿Ves la intersección? Hazla cruzar.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Abrí la demo 3D y probá los tres modos de simulación en tiempo real.
        </p>
        <div className="mt-8">
          <Button href="/demo" variant="primary" size="lg">
            Abrir demostración
          </Button>
        </div>
      </div>
    </section>
  );
}