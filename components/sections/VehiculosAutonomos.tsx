import Badge from "@/components/ui/Badge";

const levels = [
  {
    level: "L0",
    name: "Sin automatización",
    desc: "El conductor controla todo el tiempo.",
  },
  {
    level: "L1",
    name: "Asistencia al conductor",
    desc: "Ayuda puntual en dirección o velocidad.",
  },
  {
    level: "L2",
    name: "Automatización parcial",
    desc: "Dirección y aceleración simultáneas con conductor atento.",
  },
  {
    level: "L3",
    name: "Automatización condicional",
    desc: "El sistema conduce; el humano interviene cuando se le pide.",
  },
  {
    level: "L4",
    name: "Alta automatización",
    desc: "Conduce sin intervención en zonas y condiciones definidas.",
  },
  {
    level: "L5",
    name: "Automatización completa",
    desc: "Sin volante ni conductor: decide y actúa por sí mismo.",
  },
];

export default function VehiculosAutonomos() {
  return (
    <section
      id="autonomos"
      className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <p className="font-mono text-sm tracking-[0.3em] text-accent">
        VEHÍCULOS AUTÓNOMOS
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        Del conductor al algoritmo.
      </h2>
      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <div className="space-y-4 text-base leading-relaxed text-muted">
          <p>
            La autonomía se mide en seis niveles definidos por la SAE, de la
            asistencia mínima al vehículo totalmente autónomo. Cuanto mayor el
            nivel, más decisiones toma el sistema y menos el humano.
          </p>
          <p>
            Un vehículo autónomo <span className="text-foreground">percibe</span> el
            entorno con sensores (cámaras, LiDAR, radar),{" "}
            <span className="text-foreground">decide</span> con algoritmos cuál es la
            acción segura y la <span className="text-foreground">ejecuta</span> con
            actuadores. En IntersectIA esa cadena se simplifica: el nodo IoT
            percibe y decide por él; el vehículo solo actúa.
          </p>
        </div>
        <ul className="space-y-3">
          {levels.map((item) => (
            <li
              key={item.level}
              className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <Badge variant="emerald" className="mt-0.5 shrink-0">
                {item.level}
              </Badge>
              <div>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-sm text-muted">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}