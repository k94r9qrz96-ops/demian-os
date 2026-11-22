"use client";
import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";
import { Img } from "./Img";
import { waLink, WA, mailLink } from "@/lib/site";
import { track } from "@/lib/analytics";

const ITEMS = [
  { t: "Gestão de viagens", d: "Planejamento e acompanhamento das viagens da equipe, do pedido à volta." },
  { t: "Transfer executivo", d: "Deslocamentos pontuais entre aeroporto, hotel e compromissos." },
  { t: "Eventos, feiras e convenções", d: "Logística de viagem para grupos e participações em eventos." },
  { t: "Política de viagens e compliance", d: "Apoio na definição de regras claras para as viagens da empresa." },
];

export function Corporate() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(".cp-media", { clipPath: "inset(12% 0 12% 0 round 28px)" }, {
          clipPath: "inset(0% 0 0% 0 round 28px)", ease: "none",
          scrollTrigger: { trigger: ".cp-media", start: "top 90%", end: "center 50%", scrub: true },
        });
        gsap.fromTo(".cp-media img", { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".cp-media", start: "top bottom", end: "bottom top", scrub: true } });
        gsap.from(".cp-item", { opacity: 0, x: -24, stagger: 0.1, duration: 0.9, scrollTrigger: { trigger: ".cp-list", start: "top 80%" } });
      });
    },
    { scope: root }
  );

  return (
    <section id="corporativo" ref={root} className="relative overflow-hidden bg-ocean text-sand" aria-labelledby="cp-title">
      <div className="gutter mx-auto grid max-w-[1400px] gap-12 py-24 md:grid-cols-2 md:gap-20 md:py-32">
        <div className="flex flex-col">
          <p className="eyebrow mb-6 text-champagne">Para empresas</p>
          <h2 id="cp-title" className="display text-[clamp(2.8rem,6vw,5.6rem)] leading-[0.95]">
            Viagens corporativas, <em className="text-champagne">sem atrito.</em>
          </h2>
          <p className="lede mt-6 max-w-[44ch] text-sand/75">
            Sua equipe viaja para trabalhar — a Beloti Travel cuida do resto. Atendimento próximo, organização e um ponto único de contato para as viagens da empresa.
          </p>
          <ul className="cp-list mt-10 divide-y divide-sand/12 border-y border-sand/12">
            {ITEMS.map((it, i) => (
              <li key={it.t} className="cp-item grid grid-cols-[2.5rem_1fr] gap-3 py-5">
                <span className="pt-1 text-xs font-bold text-champagne">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-lg font-semibold">{it.t}</p>
                  <p className="mt-1 text-sm text-sand/65">{it.d}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={waLink(WA.corporativo)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              onClick={() => { track("corporate_cta_click", { channel: "whatsapp" }); track("whatsapp_click", { location: "corporativo" }); }}
            >
              Solicitar uma proposta corporativa<span className="sr-only"> (WhatsApp, abre em nova aba)</span>
            </a>
            <a
              href={mailLink("Proposta de viagens corporativas", "Olá, Beloti Travel!\n\nEmpresa:\nCidade:\nNúmero aproximado de viajantes por mês:\nPrincipais destinos:\n\nObrigado!")}
              className="btn btn-ghost"
              onClick={() => track("corporate_cta_click", { channel: "email" })}
            >
              Enviar por e-mail
            </a>
          </div>
        </div>
        <div className="cp-media relative min-h-[420px] overflow-hidden rounded-[28px] md:min-h-0">
          <Img name="corporativo" alt="Profissionais com passaporte em um terminal de aeroporto" sizes="(min-width: 900px) 50vw, 100vw" className="absolute inset-0 h-[116%] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean/70 via-transparent to-transparent" />
          <p className="display absolute bottom-6 left-6 right-6 text-2xl italic leading-snug md:text-3xl">
            Seriedade, ética e dedicação em cada embarque.
          </p>
        </div>
      </div>
    </section>
  );
}
