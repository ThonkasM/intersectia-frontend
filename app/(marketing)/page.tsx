import Hero from "@/components/sections/Hero";
import QueEsIoT from "@/components/sections/QueEsIoT";
import VehiculosAutonomos from "@/components/sections/VehiculosAutonomos";
import RelacionIoTAV from "@/components/sections/RelacionIoTAV";
import CasoDeEstudio from "@/components/sections/CasoDeEstudio";
import ComoFuncionaLaDemo from "@/components/sections/ComoFuncionaLaDemo";
import CTADemo from "@/components/sections/CTADemo";
import Equipo from "@/components/sections/Equipo";
import ChatWidget from "@/components/chat/ChatWidget";

export default function Home() {
  return (
    <main>
      <Hero />
      <QueEsIoT />
      <VehiculosAutonomos />
      <RelacionIoTAV />
      <CasoDeEstudio />
      <ComoFuncionaLaDemo />
      <CTADemo />
      <Equipo />
      <ChatWidget />
    </main>
  );
}