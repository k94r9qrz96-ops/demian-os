import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { Destinations } from "@/components/Destinations";
import { Cruise } from "@/components/Cruise";
import { Services } from "@/components/Services";
import { Corporate } from "@/components/Corporate";
import { Planner } from "@/components/Planner";
import { Story } from "@/components/Story";
import { Globe } from "@/components/Globe";
import { Closing, Footer } from "@/components/Closing";
import { FloatingContact } from "@/components/FloatingContact";
import { Consent } from "@/components/Consent";
import { DemoBadge } from "@/components/DemoBadge";

export default function Home() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <Manifesto />
        <Destinations />
        <Cruise />
        <Services />
        <Corporate />
        <Story />
        <Planner />
        <Globe />
        <Closing />
      </main>
      <Footer />
      <FloatingContact />
      <Consent />
      <DemoBadge />
    </>
  );
}
