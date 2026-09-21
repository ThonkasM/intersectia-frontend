import Card from "@/components/ui/Card";

const pillars = [
  {
    tag: "AIM · 2008",
    title: "Gestión autónoma de intersecciones",
    body: "El paradigma de Dresner y Stone: la intersección es un agente que concede reservas de espacio-tiempo a los vehículos. Puede emular un semáforo o un stop, por eso los subsume, y con autónomos los supera en espera y throughput.",
  },
  {
    tag: "V2X",
    title: "Comunicación vehículo-entorno",
    body: "V2V, V2I, V2P y V2N. Las radios C-V2X (3GPP, enlace PC5) y DSRC/ITS-G5 (IEEE 802.11p) operan en 5.9 GHz; los mensajes de estado se estandarizan como BSM (SAE J2735). IntersectIA usa el canal V2I para coordinar el cruce.",
  },
  {
    tag: "SAE J3016",
    title: "Niveles de autonomía",
    body: "Los seis niveles se definen por quién ejecuta la tarea de conducción (DDT) y su fallback dentro de un ODD. La frontera clave está entre L3 (pide al humano que retome) y L4 (no lo pide).",
  },
  {
    tag: "RL",
    title: "Aprendizaje por refuerzo",
    body: "La decisión se modela como un MDP (estado, acción, recompensa) y se resuelve con Q-learning. La política se entrena offline, en CPU y con semilla fija, y se carga en memoria dentro del presupuesto de 150 ms.",
  },
  {
    tag: "Equidad",
    title: "Más allá del promedio",
    body: "Un buen promedio puede ocultar una dirección postergada. Por eso importan el p95 y la equidad entre direcciones, y por eso el sistema acota la inanición con un límite de espera de 25 segundos.",
  },
  {
    tag: "Edge",
    title: "Latencia y gemelo digital",
    body: "El ciclo percibir, decidir y actuar debe caber en milisegundos, así que el gestor corre junto a la simulación y no en la nube. El backend actúa como un gemelo digital determinista y reproducible.",
  },
];

const references = [
  "Dresner, K. & Stone, P. (2008). A Multiagent Approach to Autonomous Intersection Management. JAIR 31:591-656.",
  "SAE J2735 — V2X Communications Message Set Dictionary (BSM).",
  "SAE J3016 (ISO PAS 22736) — Taxonomy of Driving Automation.",
  "Varaiya, P. (2013). The max-pressure controller for networks of signalized intersections.",
];

export default function Teoria() {
  return (
    <section id="teoria" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <p className="font-mono text-sm tracking-[0.3em] text-accent">
        TEORÍA
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        Las ideas detrás del cruce.
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted">
        IntersectIA no parte de cero: se apoya en investigación sobre gestión de
        intersecciones, comunicación vehicular y aprendizaje por refuerzo. Estos
        son los pilares que sostienen la demo y que el asistente puede ampliar.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pillars.map((pillar) => (
          <Card key={pillar.tag}>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              {pillar.tag}
            </p>
            <h3 className="mt-2 font-semibold text-foreground">
              {pillar.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {pillar.body}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-surface p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Referencias
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
          {references.map((reference) => (
            <li key={reference}>{reference}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
