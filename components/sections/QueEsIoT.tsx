import Card from "@/components/ui/Card";

const pillars = [
  {
    title: "Sensores",
    body: "Miden el entorno: presencia de vehículos, velocidad, distancia y cruce de líneas.",
  },
  {
    title: "Conectividad",
    body: "Llevan esas lecturas a un nodo central a través de la red, con baja latencia.",
  },
  {
    title: "Edge / Cloud",
    body: "El procesamiento ocurre cerca de los datos (edge) o se agrega en la nube.",
  },
  {
    title: "Datos en tiempo real",
    body: "El valor está en la inmediatez: decidir con lecturas del instante, no de ayer.",
  },
];

export default function QueEsIoT() {
  return (
    <section id="iot" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <p className="font-mono text-sm tracking-[0.3em] text-accent">¿QUÉ ES IOT?</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        El mundo físico, conectado.
      </h2>
      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <div className="space-y-4 text-base leading-relaxed text-muted">
          <p>
            Internet de las Cosas (IoT) conecta objetos físicos —sensores,
            semáforos, vehículos— a la red para que midan su entorno y compartan
            datos sin intervención humana.
          </p>
          <p>
            Un nodo IoT recopila señales del mundo real, las procesa y actúa en
            consecuencia. La intersección deja de ser un lugar ciego y pasa a ser
            un sistema que observa, decide y responde en milisegundos.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar) => (
            <Card key={pillar.title} title={pillar.title}>
              <p className="text-sm leading-relaxed text-muted">
                {pillar.body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}