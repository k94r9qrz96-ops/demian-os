"use client";
import { useRef } from "react";
import { gsap, SplitText, useGSAP, MOTION_OK } from "@/lib/gsap";

const SERVICES = [
  "Passagens aéreas", "Hospedagem", "Cruzeiros", "Seguro viagem", "Aluguel de veículos", "Ingressos",
  "Transfers", "Passeios", "Câmbio", "Pacotes nacionais", "Pacotes internacionais", "Excursões rodoviárias", "Viagens corporativas",
];

export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const split = SplitText.create(".mf-text", { type: "words", aria: "none" });
        gsap.fromTo(split.words, { opacity: 0.14 }, {
          opacity: 1, stagger: 0.08, ease: "none",
          scrollTrigger: { trigger: ".mf-text", start: "top 80%", end: "bottom 45%", scrub: true },
        });
        gsap.from(".mf-sign", { opacity: 0, y: 20, scrollTrigger: { trigger: ".mf-sign", start: "top 90%" } });
        return () => split.revert();
      });
    },
    { scope: root }
  );

  return (
    <section id="manifesto" ref={root} className="relative bg-abyss pb-20 pt-28 text-sand md:pb-28 md:pt-40" aria-labelledby="mf-title">
      <div className="gutter mx-auto max-w-[1400px]">
        <p className="eyebrow mb-10 text-champagne">The world is waiting</p>
        <h2 id="mf-title" className="sr-only">Nosso manifesto</h2>
        <p className="mf-text display max-w-[22ch] text-[clamp(2.1rem,5.6vw,5.4rem)] leading-[1.02]">
          Viajar vai muito além de visitar lugares. É sobre viver experiências e <em className="text-champagne">colecionar momentos</em> que ficam para sempre.
        </p>
        <div className="mf-sign mt-12 flex flex-col gap-6 border-t border-sand/15 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[46ch] text-sand/70">
            Uma agência familiar de São Bernardo do Campo que planeja cada detalhe com seriedade, ética e o carinho que gostaríamos para nós mesmos.
          </p>
          <a href="#historia" className="ulink self-start text-sm font-semibold text-champagne md:self-auto">Conheça nossa história →</a>
        </div>
      </div>
      <div className="mt-20 overflow-hidden border-y border-sand/10 py-5" aria-hidden="true">
        <div className="marquee flex w-max gap-10 whitespace-nowrap">
          {[...SERVICES, ...SERVICES].map((s, i) => (
            <span key={i} className="display flex items-center gap-10 text-3xl italic text-sand/60 md:text-4xl">
              {s}<span className="inline-block h-1.5 w-1.5 rotate-45 bg-champagne" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
