import Card from "@/components/ui/Card";

const channels = [
  {
    title: "V2V",
    subtitle: "Vehículo a vehículo",
    body: "Los vehículos comparten posición, velocidad e intención entre sí para coordinar maniobras sin esperar señales externas.",
  },
  {
    title: "V2I",
    subtitle: "Vehículo a infraestructura",
    body: "El vehículo conversa con el semáforo o el nodo de la intersección. Es el canal que IntersectIA usa para recibir la orden de cruzar.",
  },
  {
    title: "Edge vs Cloud",
    subtitle: "Latencia",
    body: "Las decisiones críticas necesitan el edge: milisegundos, no idas y vueltas a la nube. El nodo IoT gestiona la intersección localmente, en tiempo real.",
  },
];

export default function RelacionIoTAV() {
  return (
    <section
      id="relacion"
      className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <p className="font-mono text-sm tracking-[0.3em] text-accent">
        IOT ↔ AUTÓNOMOS
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        La ciudad que habla con los vehículos.
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted">
        Un vehículo autónomo no decide solo: se coordina con los demás y con la
        infraestructura. El IoT es el sistema nervioso que convierte la ciudad en
        un interlocutor capaz de ordenar el cruce antes de que ocurra el caos.
      </p>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {channels.map((channel) => (
          <Card key={channel.title}>
            <p className="font-mono text-sm tracking-widest text-accent">
              {channel.title}
            </p>
            <h3 className="mt-2 font-semibold text-foreground">{channel.subtitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {channel.body}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}