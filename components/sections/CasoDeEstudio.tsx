import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

const modes = [
  {
    title: "Modo tradicional",
    badge: "Art. 52 · Sin gestor",
    variant: "muted" as const,
    body: "Prioridad al de la derecha: cada conductor negocia, espera y asume riesgo. Largas colas en hora pico.",
  },
  {
    title: "Modo IoT gestionado",
    badge: "Algoritmo determinista FIFO",
    variant: "emerald" as const,
    body: "Un nodo central registra cada llegada y otorga el paso en orden estricto. Sin ambigüedad ni regateos.",
  },
  {
    title: "Modo IoT + IA",
    badge: "Política de decisión IA",
    variant: "accent" as const,
    body: "El gestor compara una política basada en IA contra el algoritmo determinista para medir la mejora.",
  },
];

export default function CasoDeEstudio() {
  return (
    <section id="caso" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <p className="font-mono text-sm tracking-[0.3em] text-accent">
        CASO DE ESTUDIO
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        IntersectIA: el gestor de la intersección.
      </h2>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card title="Problemática">
          <p className="text-sm leading-relaxed text-muted">
            En un cruce de 4 vías con prioridad a la derecha —el Art. 52 del
            Código Nacional de Tránsito de Bolivia— cada conductor negocia el
            paso por su cuenta. El resultado: esperas reales, atascos en hora
            pico y riesgo permanente de choque.
          </p>
        </Card>
        <Card title="Solución">
          <p className="text-sm leading-relaxed text-muted">
            IntersectIA concentra la decisión en un nodo IoT central (backend):
            él decide quién cruza y los vehículos solo renderizan y ejecutan lo
            que el nodo indica. Así la intersección se gestiona sola, sin
            ambigüedad.
          </p>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {modes.map((mode) => (
          <Card key={mode.title}>
            <Badge variant={mode.variant}>{mode.badge}</Badge>
            <h3 className="mt-3 font-semibold text-foreground">{mode.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {mode.body}
            </p>
          </Card>
        ))}
      </div>
      <p className="mt-8 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 font-mono text-sm text-emerald-text">
        La demo mide el tiempo de espera promedio por modo para cuantificar la
        mejora frente al Art. 52.
      </p>
    </section>
  );
}