import MemberAvatar from "@/components/sections/MemberAvatar";

const members = [
  { apellido: "Arteaga", nombre: "Miguel", photo: "/assets/equipo/Arteaga-Miguel.jpeg" },
  { apellido: "Caballero", nombre: "Cesar", photo: "/assets/equipo/Caballero-Cesar.jpeg" },
  { apellido: "Carvajal", nombre: "Jorge", photo: "/assets/equipo/Carvajal-Jorge.jpeg" },
  { apellido: "Veslasquez", nombre: "Arnulfo", photo: "/assets/equipo/Veslasquez-Arnulfo.jpeg" },
  { apellido: "Yebara", nombre: "Diego", photo: "/assets/equipo/Yebara-Diego.jpeg" },
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
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {members.map((member) => (
          <div
            key={`${member.apellido}-${member.nombre}`}
            className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center"
          >
            <MemberAvatar
              src={member.photo}
              alt={`${member.apellido} ${member.nombre}`}
              initials={`${member.apellido[0]}${member.nombre[0]}`}
            />
            <p className="mt-4 font-semibold text-foreground">
              {member.apellido} {member.nombre}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
