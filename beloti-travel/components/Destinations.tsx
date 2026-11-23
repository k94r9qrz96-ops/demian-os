"use client";
import { useMemo, useRef, useState } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, MOTION_OK } from "@/lib/gsap";
import { DESTINATIONS, MOODS, type Mood } from "@/data/destinations";
import { Img } from "./Img";
import { LazyVideo } from "./LazyVideo";
import { imgSet } from "@/lib/asset";
import { waLink, WA } from "@/lib/site";
import { track } from "@/lib/analytics";

const MOOD_LABEL: Record<Mood, string> = { aventura: "Aventura", relax: "Relax", cultura: "Cultura", familia: "Família" };

export function Destinations() {
  const root = useRef<HTMLElement>(null);
  const [mood, setMood] = useState<Mood | "todos">("todos");
  const [active, setActive] = useState(0);
  const list = useMemo(() => (mood === "todos" ? DESTINATIONS : DESTINATIONS.filter((d) => d.moods.includes(mood))), [mood]);

  useGSAP(
    () => {
      const scenes = gsap.utils.toArray<HTMLElement>(".dest-scene");
      scenes.forEach((scene, i) => {
        ScrollTrigger.create({
          trigger: scene,
          start: "top 55%",
          end: "bottom 45%",
          onToggle: (self) => self.isActive && setActive(i),
        });
      });

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const splits: SplitText[] = [];
        scenes.forEach((scene, i) => {
          const bg = scene.querySelector(".dest-bg");
          const clip = scene.querySelector(".dest-clip");
          const name = scene.querySelector(".dest-name");
          const rest = scene.querySelectorAll(".dest-fade");

          // Entrada: a janela se expande (clip-path) enquanto a imagem desce em parallax.
          if (i > 0) {
            gsap.timeline({ scrollTrigger: { trigger: scene, start: "top bottom", end: "top top", scrub: 0.5 } })
              .fromTo(clip, { clipPath: "inset(18% 9% 0% 9% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none" }, 0)
              .fromTo(bg, { yPercent: -12, scale: 1.25 }, { yPercent: 0, scale: 1.08, ease: "none" }, 0);
          } else {
            gsap.fromTo(bg, { scale: 1.2 }, { scale: 1.08, ease: "none", scrollTrigger: { trigger: scene, start: "top bottom", end: "top top", scrub: true } });
          }
          // Saída: a cena anterior recua em profundidade enquanto a próxima a cobre.
          if (i < scenes.length - 1) {
            gsap.to(scene.querySelector(".dest-content"), {
              opacity: 0, y: -40, ease: "none",
              scrollTrigger: { trigger: scenes[i + 1], start: "top bottom", end: "top 55%", scrub: true },
            });
            gsap.to(scene.querySelector(".dest-inner"), {
              scale: 0.9, opacity: 0.35, ease: "none",
              scrollTrigger: { trigger: scenes[i + 1], start: "top bottom", end: "top top", scrub: true },
            });
          }
          // Tipografia: letras gigantes sobem de dentro da máscara.
          if (name) {
            const s = SplitText.create(name, {
              type: "chars", mask: "chars", autoSplit: true,
              onSplit: (self) => gsap.from(self.chars, {
                yPercent: 115, duration: 1.2, stagger: 0.035, ease: "expo.out",
                scrollTrigger: { trigger: scene, start: "top 35%", toggleActions: "play none none reverse" },
              }),
            });
            splits.push(s);
          }
          gsap.from(rest, {
            opacity: 0, y: 26, duration: 1, stagger: 0.08,
            scrollTrigger: { trigger: scene, start: "top 30%", toggleActions: "play none none reverse" },
          });
        });
        return () => splits.forEach((s) => s.revert());
      });
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [list], revertOnUpdate: true }
  );

  const goTo = (i: number) => {
    const el = root.current?.querySelectorAll<HTMLElement>(".dest-scene")[i];
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 2, behavior: reduce ? "auto" : "smooth" });
    el.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  };

  const pick = (m: Mood | "todos") => {
    setMood(m);
    setActive(0);
    requestAnimationFrame(() => {
      const top = root.current?.querySelector<HTMLElement>(".dest-filters");
      if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start" });
    });
  };

  return (
    <section id="destinos" ref={root} className="relative bg-abyss text-sand" aria-labelledby="dest-title">
      <div className="gutter mx-auto max-w-[1400px] pb-14 pt-24 md:pb-20 md:pt-32">
        <p className="eyebrow mb-6 text-champagne">Capítulo II · Destinos</p>
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <h2 id="dest-title" className="display max-w-[12ch] text-[clamp(2.8rem,7vw,6.5rem)]">
            Para onde o mundo <em className="text-champagne">te chama?</em>
          </h2>
          <div className="dest-filters scroll-mt-24">
            <p id="mood-label" className="mb-3 text-sm text-sand/60">Filtrar por tipo de experiência</p>
            <div role="group" aria-labelledby="mood-label" className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] md:mx-0 md:flex-wrap md:px-0">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mood === m.id}
                  onClick={() => pick(m.id)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold ring-1 transition-colors duration-300 ${
                    mood === m.id ? "bg-champagne text-abyss ring-champagne" : "text-sand/80 ring-sand/25 hover:ring-sand/60"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="sr-only" aria-live="polite">{list.length} destinos exibidos</p>
          </div>
        </div>
      </div>

      {/* Navegação de cenas (fixa durante o capítulo) */}
      <div className="pointer-events-none sticky top-[calc(100svh-4.75rem)] z-30 h-0">
        <nav aria-label="Cenas de destinos" className="flex justify-center">
          <ol className="no-scrollbar pointer-events-auto flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-full bg-abyss/60 p-1.5 ring-1 ring-sand/15 backdrop-blur-xl">
            {list.map((d, i) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active === i ? "true" : undefined}
                  className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors duration-300 md:px-4 ${
                    active === i ? "bg-sand text-ocean" : "text-sand/75 hover:text-sand"
                  }`}
                >
                  <span className="mr-1.5 opacity-50">{String(i + 1).padStart(2, "0")}</span>
                  {d.name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="relative">
        {list.map((d, i) => (
          <article key={d.id} id={`destino-${d.id}`} className="dest-scene sticky top-0 h-[100svh] min-h-[560px] overflow-hidden" aria-labelledby={`dn-${d.id}`}>
            <div className="dest-inner absolute inset-0 origin-top will-change-transform">
              <div className="dest-clip absolute inset-0 overflow-hidden bg-ocean">
                <div className="dest-bg absolute inset-0 will-change-transform">
                  <Img name={d.img} alt="" sizes="100vw" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: d.focus }} />
                  {d.video && (
                    <LazyVideo src={d.video} poster={imgSet("/img/praias-poster-1280.jpg")} className="absolute inset-0 hidden h-full w-full object-cover md:block" />
                  )}
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,30,0.35)_0%,rgba(3,19,30,0)_35%,rgba(3,19,30,0.25)_60%,rgba(3,19,30,0.92)_100%)]" />
                <div className="grain absolute inset-0" />
              </div>

              <div className="dest-content gutter relative flex h-full flex-col justify-end pb-32 md:pb-36">
                <div className="dest-fade mb-4 flex items-center gap-4 text-sand/75">
                  <span className="eyebrow text-champagne">{String(i + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}</span>
                  <span className="h-px w-10 bg-sand/40" aria-hidden="true" />
                  <span className="eyebrow">{d.kicker}</span>
                </div>
                <h3 id={`dn-${d.id}`} className="dest-name display -ml-[0.04em] text-[clamp(4.4rem,17vw,17rem)] leading-[0.82] tracking-[-0.04em]">
                  {d.name}
                </h3>
                <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
                  <div className="max-w-[52ch]">
                    <p className="dest-fade display text-2xl italic leading-snug text-sand md:text-3xl">{d.line}</p>
                    <p className="dest-fade mt-3 text-[0.98rem] leading-relaxed text-sand/78">{d.text}</p>
                    <ul className="dest-fade mt-4 flex flex-wrap gap-2" aria-label="Tipo de experiência">
                      {d.moods.map((m) => (
                        <li key={m} className="rounded-full px-3 py-1 text-xs font-semibold text-sand/85 ring-1 ring-sand/30">{MOOD_LABEL[m]}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="dest-fade flex flex-wrap items-center gap-3">
                    <a
                      href={waLink(WA.destino(d.name === "Praias" ? "um destino de praia" : d.name === "Ecoturismo" ? "um destino de ecoturismo" : d.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      onClick={() => { track("destination_click", { destination: d.id }); track("whatsapp_click", { location: `destino_${d.id}` }); }}
                    >
                      Consultar viagem
                      <span className="sr-only"> para {d.name} pelo WhatsApp (abre em nova aba)</span>
                      <svg className="btn-arrow" width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" /></svg>
                    </a>
                    {i < list.length - 1 && (
                      <button type="button" onClick={() => goTo(i + 1)} className="ulink hidden text-sm font-semibold text-sand/80 md:inline">
                        Próximo: {list[i + 1].name} ↓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
