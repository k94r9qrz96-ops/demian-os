"use client";
import { useEffect, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoDistance, type GeoPermissibleObjects } from "d3-geo";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";
import { Img } from "./Img";
import { waLink, WA } from "@/lib/site";
import { track } from "@/lib/analytics";

type Region = {
  id: string;
  name: string;
  center: [number, number];
  img: string;
  line: string;
  groups: string[];
  points: { n: string; c: [number, number] }[];
};

// Agrupamentos inspiracionais a partir das categorias reais da agência. Não representam voos,
// trajetos ou produtos contratáveis — tudo é consultado no atendimento.
const REGIONS: Region[] = [
  {
    id: "brasil", name: "Brasil e América do Sul", center: [-50, -16], img: "praias-rio",
    line: "Praias, natureza e roteiros nacionais, perto de casa.",
    groups: ["Praias", "Ecoturismo", "Pacotes nacionais", "Excursões rodoviárias"],
    points: [{ n: "Rio de Janeiro", c: [-43.2, -22.9] }, { n: "Salvador", c: [-38.5, -12.97] }, { n: "Foz do Iguaçu", c: [-54.58, -25.54] }, { n: "Fernando de Noronha", c: [-32.42, -3.85] }],
  },
  {
    id: "europa", name: "Europa", center: [12, 46], img: "europa-santorini",
    line: "Circuitos por cidades históricas, vilarejos e costas mediterrâneas.",
    groups: ["Circuito europeu", "Cidades históricas", "Mediterrâneo"],
    points: [{ n: "Lisboa", c: [-9.14, 38.72] }, { n: "Paris", c: [2.35, 48.86] }, { n: "Roma", c: [12.5, 41.9] }, { n: "Santorini", c: [25.43, 36.39] }],
  },
  {
    id: "dubai", name: "Dubai e Oriente Médio", center: [52, 25], img: "dubai",
    line: "Arquitetura futurista, deserto e mar do Golfo.",
    groups: ["Dubai", "Deserto", "Compras e gastronomia"],
    points: [{ n: "Dubai", c: [55.27, 25.2] }],
  },
  {
    id: "africa", name: "África", center: [24, -6], img: "africa",
    line: "Savanas, vida selvagem e culturas milenares.",
    groups: ["Safáris e natureza", "Culturas milenares"],
    points: [{ n: "Cidade do Cabo", c: [18.42, -33.92] }, { n: "Marrakech", c: [-7.99, 31.63] }, { n: "Nairóbi", c: [36.82, -1.29] }],
  },
  {
    id: "asia", name: "Ásia", center: [112, 22], img: "asia",
    line: "Templos, jardins, sabores e paisagens transformadoras.",
    groups: ["Japão", "Sudeste Asiático", "Tradição e modernidade"],
    points: [{ n: "Tóquio", c: [139.69, 35.69] }, { n: "Bangkok", c: [100.5, 13.75] }, { n: "Bali", c: [115.19, -8.4] }],
  },
];
const ORIGIN: [number, number] = [-46.63, -23.55]; // São Paulo

export function Globe() {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const land = useRef<GeoPermissibleObjects | null>(null);
  const rot = useRef({ l: 50, p: 12 });
  const [sel, setSel] = useState(0);
  const [ready, setReady] = useState(false);
  const selRef = useRef(0);
  const dragging = useRef(false);
  const idle = useRef(true);

  const render = () => {
    const el = svg.current;
    if (!el) return;
    const size = 600;
    const proj = geoOrthographic().scale(285).translate([size / 2, size / 2]).clipAngle(90).rotate([rot.current.l, -rot.current.p]);
    const path = geoPath(proj);
    const q = (s: string) => el.querySelector(s) as SVGPathElement | null;
    q(".g-sphere")?.setAttribute("d", path({ type: "Sphere" }) || "");
    q(".g-grat")?.setAttribute("d", path(geoGraticule10()) || "");
    if (land.current) q(".g-land")?.setAttribute("d", path(land.current) || "");
    const r = REGIONS[selRef.current];
    const interp = geoInterpolate(ORIGIN, r.points[0].c);
    const coords = Array.from({ length: 64 }, (_, i) => interp(i / 63));
    q(".g-arc")?.setAttribute("d", path({ type: "LineString", coordinates: coords }) || "");
    const center: [number, number] = [-rot.current.l, rot.current.p];
    el.querySelectorAll<SVGGElement>(".g-pt").forEach((g) => {
      const c = JSON.parse(g.dataset.c || "[0,0]") as [number, number];
      const visible = geoDistance(c, center) < Math.PI / 2 - 0.05;
      const xy = proj(c);
      g.style.opacity = visible ? "" : "0";
      if (xy) g.setAttribute("transform", `translate(${xy[0]} ${xy[1]})`);
    });
  };

  // reposiciona marcadores recém-renderizados ao trocar de região
  useEffect(() => { render(); }, [sel]);

  // Carrega o mapa só quando o capítulo se aproxima
  useEffect(() => {
    let cancelled = false;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || land.current) return;
      io.disconnect();
      const [{ feature }, topo] = await Promise.all([import("topojson-client"), import("world-atlas/land-110m.json")]);
      if (cancelled) return;
      const t = (topo as { default?: unknown }).default ?? topo;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      land.current = feature(t as any, (t as any).objects.land) as unknown as GeoPermissibleObjects;
      setReady(true);
      render();
    }, { rootMargin: "100% 0px" });
    if (root.current) io.observe(root.current);
    render();
    return () => { cancelled = true; io.disconnect(); };
  }, []);

  // Rotação automática suave quando ocioso
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (root.current) io.observe(root.current);
    const tick = () => {
      if (visible && idle.current && !dragging.current) { rot.current.l += 0.04; render(); }
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); io.disconnect(); };
  }, []);

  const choose = (i: number) => {
    setSel(i);
    selRef.current = i;
    idle.current = false;
    track("region_select", { region: REGIONS[i].id });
    const [lon, lat] = REGIONS[i].center;
    let target = -lon;
    // menor caminho angular
    while (target - rot.current.l > 180) target -= 360;
    while (target - rot.current.l < -180) target += 360;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(rot.current, {
      l: target, p: Math.max(-30, Math.min(35, lat)),
      duration: reduce ? 0 : 1.6, ease: "power3.inOut", onUpdate: render,
      onComplete: () => { setTimeout(() => (idle.current = true), 6000); },
    });
    if (!reduce) {
      gsap.fromTo(".g-arc", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", delay: 0.3 });
      gsap.fromTo(".gx-panel > *", { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.7, ease: "power3.out" });
      gsap.fromTo(".gx-img", { clipPath: "inset(0 100% 0 0 round 20px)" }, { clipPath: "inset(0 0% 0 0 round 20px)", duration: 1.1, ease: "expo.inOut" });
    }
  };

  // arrastar para girar (horizontal); o scroll vertical continua livre no toque
  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    idle.current = false;
    const sx = e.clientX, sy = e.clientY, l0 = rot.current.l, p0 = rot.current.p;
    const move = (ev: PointerEvent) => {
      rot.current.l = l0 + (ev.clientX - sx) * 0.35;
      if (ev.pointerType === "mouse") rot.current.p = Math.max(-60, Math.min(60, p0 + (ev.clientY - sy) * 0.25));
      render();
    };
    const up = () => {
      dragging.current = false;
      setTimeout(() => (idle.current = true), 4000);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".gx-globe", { scale: 0.7, opacity: 0, rotate: -20, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: ".gx-globe", start: "top 85%" } });
        gsap.from(".gx-tab", { opacity: 0, y: 20, stagger: 0.06, duration: 0.8, scrollTrigger: { trigger: ".gx-tabs", start: "top 90%" } });
      });
    },
    { scope: root }
  );

  const r = REGIONS[sel];

  return (
    <section id="explorar" ref={root} className="relative overflow-hidden bg-abyss text-sand" aria-labelledby="gx-title">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(101,201,206,0.12),transparent_60%)]" aria-hidden="true" />
      <div className="gutter relative mx-auto max-w-[1400px] py-24 md:py-32">
        <div className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-6 text-champagne">Capítulo VII · Explorador</p>
            <h2 id="gx-title" className="display max-w-[14ch] text-[clamp(2.8rem,6vw,5.6rem)] leading-[0.95]">
              Gire o mundo. <em className="text-champagne">Escolha o ponto de partida dos seus sonhos.</em>
            </h2>
          </div>
          <p className="max-w-[36ch] text-sand/65">Selecione uma região para ver inspirações e pedir uma cotação. Saindo de São Paulo, para qualquer lugar.</p>
        </div>

        <div className="gx-tabs no-scrollbar -mx-[var(--gutter)] mb-10 flex gap-2 overflow-x-auto px-[var(--gutter)]" role="tablist" aria-label="Regiões">
          {REGIONS.map((reg, i) => (
            <button
              key={reg.id}
              role="tab"
              id={`tab-${reg.id}`}
              aria-selected={sel === i}
              aria-controls="gx-panel"
              tabIndex={sel === i ? 0 : -1}
              onClick={() => choose(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const n = (i + (e.key === "ArrowRight" ? 1 : REGIONS.length - 1)) % REGIONS.length;
                  choose(n);
                  (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
                }
              }}
              className={`gx-tab shrink-0 rounded-full px-5 py-3 text-sm font-semibold ring-1 transition-colors duration-300 ${sel === i ? "bg-sand text-ocean ring-sand" : "text-sand/75 ring-sand/20 hover:ring-sand/55"}`}
            >
              {reg.name}
            </button>
          ))}
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="gx-globe relative mx-auto w-full max-w-[560px]">
            <svg
              ref={svg}
              viewBox="0 0 600 600"
              className={`w-full cursor-grab touch-pan-y select-none transition-opacity duration-1000 active:cursor-grabbing ${ready ? "opacity-100" : "opacity-60"}`}
              onPointerDown={onDown}
              role="img"
              aria-label={`Globo interativo centrado em ${r.name}`}
            >
              <defs>
                <radialGradient id="g-ocean" cx="40%" cy="35%" r="75%">
                  <stop offset="0%" stopColor="#0f4565" />
                  <stop offset="100%" stopColor="#041a29" />
                </radialGradient>
                <radialGradient id="g-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="85%" stopColor="#65C9CE" stopOpacity="0" />
                  <stop offset="100%" stopColor="#65C9CE" stopOpacity="0.35" />
                </radialGradient>
              </defs>
              <circle cx="300" cy="300" r="298" fill="url(#g-glow)" />
              <path className="g-sphere" fill="url(#g-ocean)" stroke="#65C9CE" strokeOpacity="0.35" />
              <path className="g-grat" fill="none" stroke="#F8F7F3" strokeOpacity="0.07" />
              <path className="g-land" fill="#D6B47A" fillOpacity="0.85" stroke="#03131e" strokeWidth="0.4" />
              <path className="g-arc" fill="none" stroke="#F8F7F3" strokeWidth="1.6" strokeDasharray="1 1" pathLength={1} strokeLinecap="round" />
              <g className="g-pt" data-c={JSON.stringify(ORIGIN)}>
                <circle r="5" fill="#65C9CE" />
                <text x="9" y="4" fontSize="12" fill="#F8F7F3" fontWeight="700">São Paulo</text>
              </g>
              {r.points.map((p) => (
                <g key={p.n} className="g-pt" data-c={JSON.stringify(p.c)}>
                  <circle r="10" fill="#F8F7F3" opacity="0.4" style={{ animation: "pulse-ring 2.4s ease-out infinite", transformBox: "fill-box", transformOrigin: "center" }} />
                  <circle r="4.5" fill="#F8F7F3" stroke="#03131e" strokeWidth="1.5" />
                  <text x="9" y="4" fontSize="12" fill="#F8F7F3">{p.n}</text>
                </g>
              ))}
            </svg>
            <p className="mt-4 text-center text-xs text-sand/45">Arraste para girar · Ilustração sem valor de rota</p>
          </div>

          <div id="gx-panel" role="tabpanel" aria-labelledby={`tab-${r.id}`} className="gx-panel">
            <div className="gx-img relative mb-8 aspect-[16/10] overflow-hidden rounded-[20px]">
              <Img key={r.img} name={r.img} alt="" sizes="(min-width: 1024px) 40vw, 100vw" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <h3 className="display text-4xl md:text-5xl">{r.name}</h3>
            <p className="lede mt-3 text-sand/75">{r.line}</p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Inspirações">
              {r.groups.map((g) => <li key={g} className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-sand/85 ring-1 ring-sand/25">{g}</li>)}
            </ul>
            <p className="mt-4 text-sm text-sand/50">Exemplos de inspiração: {r.points.map((p) => p.n).join(", ")}. Roteiros sob consulta.</p>
            <a
              href={waLink(WA.regiao(r.name))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn mt-8"
              onClick={() => track("whatsapp_click", { location: `explorador_${r.id}` })}
            >
              Solicitar cotação para {r.name}<span className="sr-only"> (WhatsApp, abre em nova aba)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
