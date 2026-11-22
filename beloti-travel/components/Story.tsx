"use client";
import { useRef } from "react";
import { gsap, SplitText, useGSAP, MOTION_OK } from "@/lib/gsap";
import { Img } from "./Img";

// Fotos reais da família fundadora, publicadas pela própria Beloti Travel (site e stories).
const PHOTOS = [
  { name: "familia-selfie", alt: "Família fundadora da Beloti Travel em uma selfie na praia", cls: "col-span-12 md:col-span-7 md:row-span-2 aspect-[16/10] md:aspect-auto [&_img]:object-[50%_30%]", speed: -6 },
  { name: "familia-coqueiros", alt: "Casal fundador sorrindo sob coqueiros", cls: "col-span-6 md:col-span-3 aspect-[3/4]", speed: 10 },
  { name: "familia-mar", alt: "Casal fundador no mar de águas claras", cls: "col-span-6 md:col-span-2 aspect-[3/4] md:mt-16", speed: 18 },
  { name: "familia-praia", alt: "Família reunida em um quiosque à beira-mar", cls: "col-span-6 md:col-span-3 aspect-[3/4]", speed: 4 },
  { name: "familia-parque", alt: "Família fundadora em um passeio em parque temático", cls: "col-span-6 md:col-span-2 aspect-[3/4]", speed: 14 },
];

export function Story() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const split = SplitText.create(".st-title", {
          type: "lines", mask: "lines", autoSplit: true, aria: "none",
          onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.3, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".st-title", start: "top 82%" } }),
        });

        gsap.utils.toArray<HTMLElement>(".st-photo").forEach((el, i) => {
          // revelação progressiva por máscara, em direções alternadas
          const from = ["inset(100% 0 0 0)", "inset(0 100% 0 0)", "inset(0 0 100% 0)", "inset(0 0 0 100%)", "inset(100% 0 0 0)"][i % 5];
          gsap.fromTo(el, { clipPath: from }, { clipPath: "inset(0 0 0 0)", duration: 1.5, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 88%" } });
          gsap.fromTo(el.querySelector("img"), { scale: 1.3 }, { scale: 1, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
          const speed = Number(el.dataset.speed || 0);
          gsap.to(el, { yPercent: -speed, ease: "none", scrollTrigger: { trigger: ".st-grid", start: "top bottom", end: "bottom top", scrub: true } });
        });

        const q = SplitText.create(".st-quote", { type: "words", aria: "none" });
        gsap.fromTo(q.words, { opacity: 0.15 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".st-quote", start: "top 80%", end: "bottom 55%", scrub: true } });
        gsap.from(".st-val", { opacity: 0, y: 30, stagger: 0.12, duration: 1, scrollTrigger: { trigger: ".st-vals", start: "top 85%" } });
        return () => { split.revert(); q.revert(); };
      });
    },
    { scope: root }
  );

  return (
    <section id="historia" ref={root} className="relative overflow-hidden bg-sand text-ocean" aria-labelledby="st-title">
      <div className="gutter mx-auto max-w-[1400px] py-24 md:py-36">
        <div className="grid gap-10 md:grid-cols-[1fr_0.8fr] md:items-end">
          <div>
            <p className="eyebrow mb-6 text-ocean/55">Capítulo V · Nossa história</p>
            <h2 id="st-title" className="st-title display text-[clamp(2.8rem,6.8vw,6.4rem)] leading-[0.95]">
              Uma família apaixonada por <em className="text-[#9c7a3f]">descobrir o mundo.</em>
            </h2>
          </div>
          <p className="lede max-w-[44ch] text-ocean/72">
            A nossa história começa muito antes da Beloti Travel existir oficialmente. Sempre tivemos a viagem como parte da vida — e foi dessa paixão que nasceu o propósito de ajudar outras pessoas a realizarem seus próprios sonhos.
          </p>
        </div>

        <div className="st-grid mt-16 grid grid-cols-12 gap-3 md:mt-24 md:auto-rows-[minmax(0,1fr)] md:gap-5">
          {PHOTOS.map((p) => (
            <figure key={p.name} className={`st-photo relative overflow-hidden rounded-[20px] bg-sand-2 ${p.cls}`} data-speed={p.speed}>
              <Img name={p.name} alt={p.alt} family sizes="(min-width: 900px) 40vw, 50vw" className="absolute inset-0 h-full w-full object-cover" />
            </figure>
          ))}
        </div>

        <div className="mt-20 grid gap-12 md:mt-32 md:grid-cols-[0.35fr_1fr]">
          <p className="eyebrow pt-3 text-ocean/50">Nosso compromisso</p>
          <div>
            <p className="st-quote display text-[clamp(2.1rem,4.6vw,4.4rem)] leading-[1.04]">
              Planejamos sua viagem com o cuidado que dedicaríamos à nossa própria família.
            </p>
            <div className="mt-10 grid gap-8 border-t border-ocean/12 pt-10 sm:grid-cols-2">
              <p className="text-ocean/72">
                <strong className="block font-semibold text-ocean">O mundo inteiro como destino.</strong>
                De praias brasileiras a circuitos pela Europa, cruzeiros e viagens corporativas.
              </p>
              <p className="text-ocean/72">
                <strong className="block font-semibold text-ocean">Atendimento de perto.</strong>
                Uma empresa que carrega nosso nome, nossos valores e nosso compromisso com cada cliente.
              </p>
            </div>
          </div>
        </div>

        <div className="st-vals mt-20 grid gap-px overflow-hidden rounded-[24px] bg-ocean/10 md:mt-28 md:grid-cols-3">
          {[
            ["Missão", "Proporcionar experiências de viagens únicas, seguras e memoráveis."],
            ["Visão", "Ser a agência inesquecível para quem busca realizar o sonho de viajar e viver experiências que marcam a vida."],
            ["Valores", "Paixão por viajar, confiança, transparência, carinho no atendimento e compromisso com cada detalhe."],
          ].map(([t, d]) => (
            <div key={t} className="st-val bg-sand p-8 md:p-10">
              <p className="display text-3xl italic text-[#9c7a3f]">{t}</p>
              <p className="mt-3 text-ocean/75">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
