import Card from "@/components/ui/Card";

const steps = [
  {
    num: "01",
    title: "El backend simula",
    body: "Genera los vehículos, los mueve, los encola y decide quién cruza según el modo activo: Art. 52, FIFO o IA.",
  },
  {
    num: "02",
    title: "Emite snapshots por WebSocket",
    body: "Cada 50 ms (20 Hz) publica el estado de cada vehículo: posición, carril y estado.",
  },
  {
    num: "03",
    title: "Three.js interpola y dibuja",
    body: "El frontend interpola las posiciones entre mensajes y renderiza la escena en 3D.",
  },
];

export default function ComoFuncionaLaDemo() {
  return (
    <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <p className="font-mono text-sm tracking-[0.3em] text-accent">LA DEMO</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        Cómo funciona.
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted">
        Toda la simulación ocurre en el backend. El frontend es solo una ventana:
        escucha por WebSocket, interpola y dibuja lo que el servidor ya decidió.
      </p>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.num}>
            <p className="font-mono text-sm tracking-widest text-accent">
              {step.num}
            </p>
            <h3 className="mt-2 font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {step.body}
            </p>
          </Card>
        ))}
      </div>
      <p className="mt-8 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 font-mono text-sm text-accent-text">
        El frontend nunca decide quién cruza: solo transcribe lo que el backend
        emite. Si el backend se detiene, la demo se detiene.
      </p>
    </section>
  );
}