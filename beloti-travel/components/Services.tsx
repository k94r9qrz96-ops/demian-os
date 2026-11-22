"use client";
import { useRef, useState } from "react";
import { gsap, useGSAP, MOTION_OK, DESKTOP } from "@/lib/gsap";
import { Img } from "./Img";
import { LazyVideo } from "./LazyVideo";
import { waLink, WA } from "@/lib/site";
import { track } from "@/lib/analytics";

const ALL = [
  { n: "Passagens aéreas", d: "Nacionais e internacionais, com a melhor combinação de horários e conexões.", img: "clouds-poster" },
  { n: "Hospedagem", d: "Hotéis, resorts e pousadas escolhidos pelo seu estilo de viagem.", img: "hotel" },
  { n: "Cruzeiros", d: "Orientação na escolha de companhia, navio, cabine e data.", img: "cruise-poster" },
  { n: "Seguro viagem", d: "Cotação de seguro adequado ao destino e ao perfil da viagem.", img: "seguro" },
  { n: "Aluguel de veículos", d: "Liberdade para explorar no seu ritmo.", img: "transfer" },
  { n: "Ingressos", d: "Parques, atrações e experiências reservados com antecedência.", img: "passeios" },
  { n: "Transfers aeroporto/hotel", d: "Chegada e partida sem preocupação.", img: "transfer" },
  { n: "Passeios", d: "Experiências locais para aproveitar cada destino.", img: "passeios" },
  { n: "Câmbio", d: "Apoio com moeda estrangeira para a sua viagem.", img: "pacote" },
  { n: "Pacotes nacionais e internacionais", d: "Tudo integrado em uma única proposta.", img: "maldivas" },
  { n: "Excursões rodoviárias", d: "Viagens em grupo por estrada.", img: "porto" },
];

function Arrow() {
  return <svg className="btn-arrow" width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

function ServiceCta({ label, service, dark }: { label: string; service: string; dark?: boolean }) {
  return (
    <a
      href={waLink(WA.servico(service))}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn ${dark ? "btn-dark" : ""}`}
      onClick={() => track("whatsapp_click", { location: `servico_${service}` })}
    >
      {label}<span className="sr-only"> (WhatsApp, abre em nova aba)</span><Arrow />
    </a>
  );
}

export function Services() {
  const root = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const preview = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // 1) VOOS — o avião percorre a rota desenhada pelo scroll, sobre as nuvens
        const fl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".sv-flight", start: "top top", end: "bottom bottom", scrub: 0.6 } });
        fl.fromTo(".fl-path", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1 }, 0)
          .to(".fl-plane", { motionPath: { path: ".fl-guide", align: ".fl-guide", alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 1 }, 0)
          .fromTo(".fl-clouds", { scale: 1.25, yPercent: 6 }, { scale: 1.05, yPercent: -4, duration: 1 }, 0)
          .from(".fl-copy > *", { opacity: 0, y: 40, stagger: 0.04, duration: 0.18 }, 0.04)
          .to(".fl-copy", { opacity: 0, y: -40, duration: 0.15 }, 0.85);

        // 2) HOSPEDAGEM — cortina cinematográfica que se abre
        const ht = gsap.timeline({ scrollTrigger: { trigger: ".sv-hotel", start: "top 75%", end: "center 45%", scrub: 0.6 } });
        ht.fromTo(".ht-l", { xPercent: 0 }, { xPercent: -101, ease: "power2.inOut" }, 0)
          .fromTo(".ht-r", { xPercent: 0 }, { xPercent: 101, ease: "power2.inOut" }, 0)
          .fromTo(".ht-img", { scale: 1.35 }, { scale: 1.05, ease: "power2.out" }, 0)
          .from(".ht-title", { letterSpacing: "0.3em", opacity: 0, ease: "power2.out" }, 0.2);

        // 3) TRIO — cada serviço com seu próprio gesto
        gsap.timeline({ scrollTrigger: { trigger: ".tr-seguro", start: "top 75%" } })
          .from(".bag", { y: 40, opacity: 0, duration: 0.9, ease: "back.out(1.6)" })
          .from(".bag-handle", { y: 10, duration: 0.5, ease: "back.out(3)" }, "-=0.3")
          .from(".bag-tag", { rotate: -40, transformOrigin: "50% 0%", duration: 1.4, ease: "elastic.out(1,0.35)" }, "-=0.3")
          .from(".shield", { scale: 0, transformOrigin: "50% 50%", duration: 0.7, ease: "back.out(2)" }, "-=1");
        gsap.timeline({ scrollTrigger: { trigger: ".tr-transfer", start: "top 80%", end: "bottom 40%", scrub: 0.5 } })
          .fromTo(".road-fill", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0)
          .fromTo(".road-car", { left: "0%" }, { left: "100%", ease: "none" }, 0);
        gsap.utils.toArray<HTMLElement>(".pc").forEach((el, i) => {
          gsap.fromTo(el, { xPercent: 0, rotate: 0, y: 30, opacity: 0 }, {
            xPercent: Number(el.dataset.x), rotate: Number(el.dataset.r), y: 0, opacity: 1,
            duration: 1.2, delay: i * 0.12, ease: "expo.out", scrollTrigger: { trigger: ".tr-passeios", start: "top 75%" },
          });
        });

        mm.add(DESKTOP, () => {
          gsap.from(".sv-row", { opacity: 0, y: 24, stagger: 0.05, duration: 0.8, scrollTrigger: { trigger: ".sv-index", start: "top 70%" } });
        });
      });
    },
    { scope: root }
  );

  const onMove = (e: React.MouseEvent) => {
    if (!preview.current) return;
    gsap.to(preview.current, { x: e.clientX + 24, y: e.clientY - 120, duration: 0.6, ease: "power3.out" });
  };

  return (
    <section id="servicos" ref={root} className="relative bg-sand text-ocean" aria-labelledby="sv-title">
      <div className="gutter mx-auto max-w-[1400px] pb-12 pt-24 md:pt-32">
        <p className="eyebrow mb-6 text-ocean/60">Capítulo IV · Serviços</p>
        <h2 id="sv-title" className="display max-w-[16ch] text-[clamp(2.8rem,7vw,6.5rem)]">
          Tudo o que a sua viagem precisa, <em className="text-[#9c7a3f]">em um só lugar.</em>
        </h2>
      </div>

      {/* 1. VOOS */}
      <div className="sv-flight relative h-[260vh]">
        <div className="sticky top-0 h-[100svh] overflow-hidden bg-ocean text-sand">
          <div className="fl-clouds absolute inset-0">
            <LazyVideo src="/media/clouds.mp4" poster="/img/clouds-poster-1280.jpg" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,39,59,0.75),rgba(8,39,59,0.25)_45%,rgba(8,39,59,0.85))]" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <path className="fl-guide" d="M-40 520 C 180 470, 260 300, 470 300 S 760 160, 1060 90" fill="none" stroke="none" />
            <defs>
              <mask id="fl-mask" maskUnits="userSpaceOnUse" x="-100" y="0" width="1200" height="600">
                <path className="fl-path" pathLength={1} strokeDasharray="1 1" d="M-40 520 C 180 470, 260 300, 470 300 S 760 160, 1060 90" fill="none" stroke="#fff" strokeWidth="14" style={{ strokeDashoffset: 0 }} />
              </mask>
            </defs>
            <path mask="url(#fl-mask)" strokeDasharray="6 8" d="M-40 520 C 180 470, 260 300, 470 300 S 760 160, 1060 90" fill="none" stroke="#D6B47A" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          </svg>
          <svg className="fl-plane absolute left-0 top-0 h-10 w-10 md:h-14 md:w-14" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M44 24c0-1.6-1.3-2.4-3-2.4H30L20 6h-4l5 15.6H11l-3-4H5l2 6.4-2 6.4h3l3-4h10L16 42h4l10-15.6h11c1.7 0 3-.8 3-2.4z" fill="#F8F7F3" />
          </svg>
          <div className="fl-copy gutter relative flex h-full flex-col justify-end pb-20 md:justify-center md:pb-0">
            <p className="eyebrow mb-4 text-champagne">01 · Passagens aéreas</p>
            <p className="display max-w-[13ch] text-[clamp(2.6rem,7vw,6.8rem)] leading-[0.95]">Acima das nuvens, <em>tudo começa.</em></p>
            <p className="mt-5 max-w-[40ch] text-sand/80">Voos nacionais e internacionais com combinações de horários e conexões pensadas para você chegar bem.</p>
            <div className="mt-8"><ServiceCta label="Cotar passagens" service="passagens aéreas" /></div>
          </div>
        </div>
      </div>

      {/* 2. HOSPEDAGEM */}
      <div className="sv-hotel gutter mx-auto grid max-w-[1400px] items-center gap-10 py-24 md:grid-cols-[1.35fr_1fr] md:gap-16 md:py-32">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] md:aspect-[16/11]">
          <div className="ht-img absolute inset-0">
            <Img name="hotel" alt="Piscina de borda infinita de um resort ao pôr do sol" sizes="(min-width: 900px) 60vw, 100vw" className="h-full w-full object-cover" />
          </div>
          <div className="ht-l absolute inset-y-0 left-0 w-1/2 bg-ocean" aria-hidden="true" />
          <div className="ht-r absolute inset-y-0 right-0 w-1/2 bg-ocean" aria-hidden="true" />
          <p className="ht-title eyebrow absolute bottom-5 left-5 rounded-full bg-sand/90 px-4 py-2 text-ocean">Hospedagem</p>
        </div>
        <div>
          <p className="eyebrow mb-4 text-ocean/55">02 · Hotéis e resorts</p>
          <h3 className="display text-[clamp(2.4rem,4.6vw,4.4rem)] leading-[0.98]">O lugar onde a viagem <em>descansa.</em></h3>
          <p className="lede mt-5 text-ocean/75">Do resort à beira-mar ao hotel boutique no centro histórico: indicamos hospedagens alinhadas ao seu estilo, à sua família e ao seu orçamento.</p>
          <div className="mt-8"><ServiceCta label="Cotar hospedagem" service="hospedagem" dark /></div>
        </div>
      </div>

      {/* 3. TRIO — seguro, transfer, passeios */}
      <div className="gutter mx-auto grid max-w-[1400px] gap-5 pb-24 md:grid-cols-3 md:pb-32">
        <article className="tr-seguro group relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[28px] bg-ocean p-7 text-sand">
          <div>
            <p className="eyebrow text-champagne">03 · Seguro viagem</p>
            <h3 className="display mt-4 text-4xl leading-none">Tranquilidade na bagagem.</h3>
            <p className="mt-3 text-sm text-sand/70">Cotação de seguro viagem adequado ao destino, à duração e ao perfil de quem viaja.</p>
          </div>
          <svg viewBox="0 0 220 170" className="mx-auto mt-6 w-[72%] transition-transform duration-700 ease-[var(--ease-cine)] group-hover:-translate-y-1.5" aria-hidden="true">
            <g className="bag">
              <g className="bag-handle"><path d="M84 46V30a8 8 0 0 1 8-8h36a8 8 0 0 1 8 8v16" fill="none" stroke="#D6B47A" strokeWidth="6" strokeLinecap="round" /></g>
              <rect x="44" y="46" width="132" height="104" rx="16" fill="#0d3550" stroke="#D6B47A" strokeWidth="2" />
              <path d="M74 46v104M146 46v104" stroke="#D6B47A" strokeOpacity=".5" strokeWidth="2" />
              <circle cx="66" cy="156" r="6" fill="#D6B47A" /><circle cx="154" cy="156" r="6" fill="#D6B47A" />
              <g className="bag-tag"><path d="M150 50v18" stroke="#F8F7F3" strokeWidth="1.5" /><rect x="138" y="66" width="24" height="16" rx="3" fill="#F8F7F3" /></g>
            </g>
            <g className="shield" transform="translate(96 76)">
              <path d="M14 0l14 5v10c0 9-6 15-14 19C6 30 0 24 0 15V5z" fill="#65C9CE" />
              <path d="M8 16l4 4 8-9" stroke="#03131e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </g>
          </svg>
          <div className="mt-6"><ServiceCta label="Cotar seguro" service="seguro viagem" /></div>
        </article>

        <article className="tr-transfer relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[28px] bg-abyss p-7 text-sand">
          <Img name="transfer" alt="" sizes="(min-width: 900px) 33vw, 100vw" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-b from-abyss/70 via-transparent to-abyss" />
          <div className="relative">
            <p className="eyebrow text-champagne">04 · Transfers</p>
            <h3 className="display mt-4 text-4xl leading-none">Do desembarque ao check-in.</h3>
            <p className="mt-3 text-sm text-sand/75">Transfer aeroporto ↔ hotel e aluguel de veículos para chegar sem preocupação.</p>
          </div>
          <div className="relative mt-10" aria-hidden="true">
            <div className="flex justify-between text-[0.65rem] font-bold uppercase tracking-[0.2em] text-sand/70"><span>Aeroporto</span><span>Hotel</span></div>
            <div className="relative mt-3 h-6">
              <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-sand/40" />
              <div className="road-fill absolute inset-x-0 top-1/2 h-[2px] origin-left bg-champagne" />
              <span className="road-car absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne shadow-[0_0_0_6px_rgba(214,180,122,0.25)]" />
            </div>
          </div>
          <div className="relative mt-6"><ServiceCta label="Cotar transfer" service="transfer aeroporto/hotel" /></div>
        </article>

        <article className="tr-passeios relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[28px] bg-sand-2 p-7">
          <div>
            <p className="eyebrow text-ocean/55">05 · Passeios e ingressos</p>
            <h3 className="display mt-4 text-4xl leading-none">Viver o destino por dentro.</h3>
            <p className="mt-3 text-sm text-ocean/70">Passeios, atrações e ingressos organizados com antecedência.</p>
          </div>
          <div className="relative mx-auto mt-6 h-[190px] w-full max-w-[280px]" aria-hidden="true">
            {[
              { img: "passeios", r: -9, x: -58 },
              { img: "asia", r: 7, x: 54 },
              { img: "ecoturismo", r: -1, x: 0 },
            ].map((p, i) => (
              <div key={i} className="pc absolute left-[27%] top-0 w-[46%] rounded-md bg-white p-1.5 pb-5 shadow-xl" data-r={p.r} data-x={p.x} style={{ transform: `translateX(${p.x}%) rotate(${p.r}deg)` }}>
                <div className="aspect-[4/5] overflow-hidden rounded-sm">
                  <Img name={p.img} alt="" sizes="160px" className="h-full w-full object-cover" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6"><ServiceCta label="Cotar passeios" service="passeios e ingressos" dark /></div>
        </article>
      </div>

      {/* 4. ÍNDICE COMPLETO */}
      <div className="sv-index gutter mx-auto max-w-[1400px] pb-24 md:pb-32" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <div className="mb-8 flex items-end justify-between gap-6 border-b border-ocean/15 pb-6">
          <h3 className="display text-3xl md:text-5xl">Todos os serviços</h3>
          <p className="hidden max-w-[34ch] text-right text-sm text-ocean/60 md:block">Escolha um serviço para pedir sua cotação pelo WhatsApp.</p>
        </div>
        <ul>
          {ALL.map((s, i) => (
            <li key={s.n} className="sv-row border-b border-ocean/10">
              <a
                href={waLink(WA.servico(s.n.toLowerCase()))}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(null)}
                onClick={() => track("whatsapp_click", { location: `indice_${s.n}` })}
                className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-5 transition-colors md:grid-cols-[4rem_1.1fr_1fr_auto] md:py-6"
              >
                <span className="text-xs font-bold text-ocean/40">{String(i + 1).padStart(2, "0")}</span>
                <span className="display text-[1.7rem] leading-none transition-transform duration-500 ease-[var(--ease-cine)] group-hover:translate-x-3 md:text-[2.6rem]">{s.n}</span>
                <span className="hidden text-sm text-ocean/60 md:block">{s.d}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ocean/20 transition-all duration-500 group-hover:bg-ocean group-hover:text-sand" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 11L11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.5" /></svg>
                </span>
                <span className="sr-only"> — pedir cotação pelo WhatsApp (abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Prévia de imagem que segue o cursor (desktop) */}
      <div
        ref={preview}
        className={`pointer-events-none fixed left-0 top-0 z-40 hidden h-[240px] w-[190px] overflow-hidden rounded-2xl shadow-2xl transition-[opacity,scale] duration-500 ease-[var(--ease-cine)] [@media(hover:hover)]:block ${hover === null ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}
        aria-hidden="true"
      >
        {hover !== null && <Img name={ALL[hover].img} alt="" sizes="190px" className="h-full w-full object-cover" />}
      </div>
    </section>
  );
}
