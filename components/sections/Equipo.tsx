const members = [
  { name: "Integrante 1", role: "Frontend / Three.js", initials: "I1" },
  { name: "Integrante 2", role: "Backend / Simulación", initials: "I2" },
  { name: "Integrante 3", role: "Arquitectura IoT / WebSocket", initials: "I3" },
  { name: "Integrante 4", role: "Investigación / IA", initials: "I4" },
];

export default function Equipo() {
  return (
    <section
      id="equipo"
      className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <p className="font-mono text-sm tracking-[0.3em] text-accent">EQUIPO</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        Quiénes lo construyen.
      </h2>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member) => (
          <div
            key={member.name}
            className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 font-mono text-sm text-accent-text">
              {member.initials}
            </span>
            <p className="mt-4 font-semibold text-foreground">{member.name}</p>
            <p className="mt-1 text-sm text-muted">{member.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}