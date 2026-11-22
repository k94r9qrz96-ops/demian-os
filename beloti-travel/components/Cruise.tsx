"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, MOTION_OK } from "@/lib/gsap";
import { waLink, WA } from "@/lib/site";
import { track } from "@/lib/analytics";
import { Img } from "./Img";

const FRAMES = 93; // quadros 5 fps, 17s→35,5s do clipe Pexels 10167690 (ver scripts/build-media.sh)
const pad = (n: number) => String(n).padStart(3, "0");

const BEATS = [
  { k: "Partida", title: <>O extraordinário também acontece <em className="text-champagne">em alto-mar.</em></> },
  { k: "Pôr do sol", title: <>Descubra novas formas de <em className="text-champagne">explorar o mundo.</em></> },
  { k: "Chegada", title: <>Do navio à cabine, escolhemos <em className="text-champagne">com você.</em></> },
];

/**
 * Capítulo de cruzeiros: sequência de quadros desenhada em <canvas> e controlada pelo scroll
 * ("câmera virtual"), com camadas de vinheta, horizonte e textos sincronizados.
 * Mais leve e fluido no iPhone do que um WebGL ou scrub de <video>.
 */
export function Cruise() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const images = useRef<HTMLImageElement[]>([]);
  const frame = useRef({ i: 0 });
  const [loaded, setLoaded] = useState(0);
  const [beat, setBeat] = useState(0);
  const [motion, setMotion] = useState(true);

  const draw = () => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const idx = Math.round(frame.current.i);
    let img = images.current[idx];
    // usa o quadro carregado mais próximo enquanto os demais chegam
    for (let d = 1; (!img || !img.complete || !img.naturalWidth) && d < FRAMES; d++) {
      img = images.current[idx - d] ?? images.current[idx + d];
    }
    if (!img || !img.naturalWidth) return;
    const { width: w, height: h } = c;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  };

  // Ajusta o canvas ao tamanho/densidade da tela
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // Pré-carrega os quadros só quando o capítulo se aproxima
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // preferência do sistema só é conhecida no cliente
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotion(!reduce);
    if (reduce) return;
    const portrait = window.matchMedia("(max-aspect-ratio: 1/1)").matches;
    const dir = portrait ? "m" : "d";
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      // primeiro, quadros-chave espaçados (a cena funciona logo); depois o restante
      const order = [...Array(FRAMES).keys()].sort((a, b) => (a % 6) - (b % 6) || a - b);
      order.forEach((i, n) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          setLoaded((l) => l + 1);
          if (Math.abs(i - frame.current.i) < 3 || n === 0) draw();
        };
        img.src = `/media/cruise/${dir}/${pad(i + 1)}.webp`;
        images.current[i] = img;
      });
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && start(), { rootMargin: "150% 0px" });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: ".cr-stage",
            start: "top top",
            end: "bottom bottom",
            scrub: 0.4,
            onUpdate: (self) => setBeat(self.progress < 0.36 ? 0 : self.progress < 0.7 ? 1 : 2),
          },
        });
        tl.to(frame.current, { i: FRAMES - 1, duration: 1, onUpdate: draw }, 0)
          // câmera: aproximação lenta → afastamento no final (vista aérea do porto)
          .fromTo(".cr-cam", { scale: 1.18, yPercent: 3 }, { scale: 1.02, yPercent: 0, duration: 0.6 }, 0)
          .to(".cr-cam", { scale: 1.12, duration: 0.25 }, 0.6)
          .to(".cr-cam", { scale: 1, duration: 0.15 }, 0.85)
          .fromTo(".cr-ship", { left: "4%" }, { left: "96%", duration: 1 }, 0)
          .fromTo(".cr-fill", { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
          .fromTo(".cr-wave", { xPercent: 0 }, { xPercent: -25, duration: 1 }, 0)
          .fromTo(".cr-veil", { opacity: 1 }, { opacity: 0, duration: 0.08 }, 0)
          .to(".cr-veil", { opacity: 0.7, duration: 0.1 }, 0.9);

        gsap.utils.toArray<HTMLElement>(".cr-beat").forEach((el, i) => {
          const a = [0.02, 0.38, 0.72][i], b = [0.32, 0.66, 1.0][i];
          tl.fromTo(el, { opacity: 0, yPercent: 30, filter: "blur(8px)" }, { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 0.08 }, a);
          if (i < 2) tl.to(el, { opacity: 0, yPercent: -30, filter: "blur(8px)", duration: 0.08 }, b - 0.08);
        });
        tl.fromTo(".cr-cta", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.08 }, 0.8);
      });
    },
    { scope: root }
  );

  useEffect(() => { ScrollTrigger.refresh(); }, [motion]);

  return (
    <section id="cruzeiros" ref={root} className="relative bg-abyss text-sand" aria-labelledby="cr-title">
      <h2 id="cr-title" className="sr-only">Cruzeiros</h2>

      {motion ? (
        <div className="cr-stage relative h-[420vh] md:h-[480vh]">
          <div className="sticky top-0 h-[100svh] overflow-hidden">
            <div className="cr-cam absolute inset-0 will-change-transform">
              {/* poster imediato até os quadros chegarem */}
              <Img name="cruise-poster" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_45%,transparent_40%,rgba(3,19,30,0.75)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-abyss/90 to-transparent" />
            <div className="cr-veil pointer-events-none absolute inset-0 bg-abyss" />
            <div className="grain pointer-events-none absolute inset-0" />

            <div className="gutter absolute inset-x-0 top-[calc(var(--header-h)+1.5rem)] flex items-center justify-between">
              <p className="eyebrow text-champagne">Capítulo III · Cruzeiros</p>
              <p className="eyebrow hidden text-sand/60 md:block" aria-hidden="true">{loaded < FRAMES ? `Carregando cena ${Math.round((loaded / FRAMES) * 100)}%` : BEATS[beat].k}</p>
            </div>

            <div className="gutter absolute inset-x-0 bottom-[7.5rem] md:bottom-[8.5rem]">
              <div className="relative min-h-[11rem] max-w-[min(100%,15ch)] md:min-h-[14rem] md:max-w-[19ch]">
                {BEATS.map((b, i) => (
                  <p key={i} className="cr-beat display absolute bottom-0 left-0 text-[clamp(2.3rem,5.6vw,5.8rem)] leading-[0.98] opacity-0" aria-hidden={beat !== i}>
                    {b.title}
                  </p>
                ))}
              </div>
              <div className="cr-cta mt-6 opacity-0">
                <a
                  href={waLink(WA.cruzeiro)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  onClick={() => { track("cruise_cta_click", { location: "cena" }); track("whatsapp_click", { location: "cruzeiro" }); }}
                >
                  Quero descobrir cruzeiros
                  <span className="sr-only"> (WhatsApp, abre em nova aba)</span>
                </a>
              </div>
            </div>

            {/* Linha náutica: progresso do capítulo (ilustrativa, não representa rota) */}
            <div className="gutter absolute inset-x-0 bottom-8" aria-hidden="true">
              <div className="relative h-8">
                <div className="absolute inset-x-0 top-1/2 h-px bg-sand/20" />
                <div className="cr-fill absolute inset-x-0 top-1/2 h-px origin-left bg-champagne" />
                <svg className="cr-ship absolute top-1/2 -translate-x-1/2 -translate-y-[85%]" width="34" height="16" viewBox="0 0 34 16" fill="none">
                  <path d="M2 10h30l-4 5H6z" fill="#D6B47A" />
                  <path d="M8 10V6h16v4M12 6V3h8v3" stroke="#F8F7F3" strokeWidth="1.2" />
                </svg>
                <div className="absolute inset-x-0 top-[calc(50%+10px)] flex justify-between text-[0.62rem] font-bold uppercase tracking-[0.22em] text-sand/55">
                  {BEATS.map((b) => <span key={b.k}>{b.k}</span>)}
                </div>
              </div>
              <svg className="cr-wave absolute -bottom-6 left-0 h-6 w-[200%] opacity-30" viewBox="0 0 1200 24" preserveAspectRatio="none">
                <path d="M0 12 Q 25 2 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 T 350 12 T 400 12 T 450 12 T 500 12 T 550 12 T 600 12 T 650 12 T 700 12 T 750 12 T 800 12 T 850 12 T 900 12 T 950 12 T 1000 12 T 1050 12 T 1100 12 T 1150 12 T 1200 12" stroke="#65C9CE" fill="none" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        // Versão estática para "reduzir movimento"
        <div className="relative min-h-[100svh]">
          <Img name="cruise-poster" alt="Navio de cruzeiro navegando ao pôr do sol" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/50 to-transparent" />
          <div className="gutter relative flex min-h-[100svh] flex-col justify-end gap-6 pb-16">
            <p className="eyebrow text-champagne">Capítulo III · Cruzeiros</p>
            {BEATS.slice(0, 2).map((b, i) => (
              <p key={i} className="display max-w-[18ch] text-[clamp(2.2rem,6vw,5rem)] leading-none">{b.title}</p>
            ))}
            <a href={waLink(WA.cruzeiro)} target="_blank" rel="noopener noreferrer" className="btn self-start" onClick={() => track("cruise_cta_click", { location: "estatico" })}>
              Quero descobrir cruzeiros
            </a>
          </div>
        </div>
      )}

      <div className="gutter mx-auto grid max-w-[1400px] gap-10 py-20 md:grid-cols-[1.1fr_1fr] md:gap-20 md:py-28">
        <div>
          <p className="display text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.05]">
            Litoral brasileiro, Caribe, Mediterrâneo ou fiordes: o roteiro certo depende de quem embarca.
          </p>
        </div>
        <div className="space-y-5 text-sand/75">
          <p>
            A Beloti Travel ajuda você a comparar companhias, navios, cabines e datas para encontrar o cruzeiro que combina com a sua família, a sua lua de mel ou a sua primeira viagem pelo mar.
          </p>
          <p className="text-sm text-sand/50">Roteiros, tarifas e disponibilidade são consultados no momento do atendimento.</p>
          <a href={waLink(WA.cruzeiro)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" onClick={() => track("cruise_cta_click", { location: "texto" })}>
            Falar sobre cruzeiros
          </a>
        </div>
      </div>
    </section>
  );
}
