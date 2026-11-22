"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, MOTION_OK, DESKTOP } from "@/lib/gsap";
import { track } from "@/lib/analytics";

const SCENES = [
  { t: 0, label: "Mar turquesa" },
  { t: 3.6, label: "Alto-mar" },
  { t: 6.8, label: "Mediterrâneo" },
  { t: 10, label: "Lagos e montanhas" },
  { t: 13.2, label: "Neve" },
];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  // Escolhe a versão vertical/horizontal do vídeo e só então baixa (evita baixar as duas).
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const portrait = window.matchMedia("(max-aspect-ratio: 1/1)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    v.src = portrait ? "/media/hero-m.mp4" : "/media/hero-d.mp4";
    if (!reduce && !saveData) {
      v.play().catch(() => setPlaying(false));
    }
    const onPlay = () => { setPlaying(true); setReady(true); };
    const onPause = () => setPlaying(false);
    const onTime = () => {
      const t = v.currentTime;
      let i = 0;
      SCENES.forEach((s, k) => { if (t >= s.t) i = k; });
      setScene(i);
      v.style.setProperty("--p", String(t / (v.duration || 16.8)));
    };
    v.addEventListener("playing", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("playing", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
    };
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Revelação por máscara linha a linha, sem recriar nós no DOM:
        // o título já pintado pelo HTML estático continua sendo o LCP.
        gsap.from(".hero-title-line", { yPercent: 108, rotate: 2, transformOrigin: "0% 100%", duration: 1.4, stagger: 0.14, ease: "expo.out", delay: 0.1 });
        const intro = gsap.timeline({ delay: 0.15 });
        intro
          .fromTo(".hero-media", { scale: 1.18 }, { scale: 1, duration: 2.6, ease: "expo.out" }, 0)
          .from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.9 }, 0.35)
          .from(".hero-sub", { opacity: 0, y: 20, duration: 1 }, 1.0)
          .from(".hero-cta > *", { opacity: 0, y: 20, duration: 0.9, stagger: 0.1 }, 1.15)
          .from(".hero-hud", { opacity: 0, duration: 1.2 }, 1.4);

        // Saída cinematográfica: a imagem vira uma "janela" e o texto se afasta em profundidade.
        mm.add(DESKTOP, () => {
          gsap.timeline({
            scrollTrigger: { trigger: root.current, start: "top top", end: "+=85%", scrub: 0.6, pin: true, anticipatePin: 1 },
          })
            .to(".hero-frame", { clipPath: "inset(7vh 5vw 7vh 5vw round 28px)", ease: "none" }, 0)
            .to(".hero-media", { scale: 1.08, ease: "none" }, 0)
            .to(".hero-content", { yPercent: -18, opacity: 0, ease: "none" }, 0)
            .to(".hero-hud, .hero-scroll", { opacity: 0, ease: "none" }, 0)
            .fromTo(".hero-next", { opacity: 0, yPercent: 40 }, { opacity: 1, yPercent: 0, ease: "none" }, 0.35);
        });
        mm.add("(max-width: 899px)", () => {
          gsap.to(".hero-media", { yPercent: 14, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
          gsap.to(".hero-content", { yPercent: -10, opacity: 0.2, ease: "none", scrollTrigger: { trigger: root.current, start: "30% top", end: "bottom top", scrub: true } });
        });
      });
    },
    { scope: root }
  );

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <section id="inicio" ref={root} className="relative h-[100svh] min-h-[600px] overflow-hidden bg-abyss text-sand" aria-label="Beloti Travel">
      <div className="hero-frame absolute inset-0 overflow-hidden [clip-path:inset(0_0_0_0_round_0px)]">
        <div className="hero-media absolute inset-0 will-change-transform">
          <picture>
            <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet="/img/hero-poster-m-640.avif 640w, /img/hero-poster-m-1280.avif 720w" sizes="100vw" />
            <source media="(max-aspect-ratio: 1/1)" type="image/webp" srcSet="/img/hero-poster-m-640.webp 640w, /img/hero-poster-m-1280.webp 720w" sizes="100vw" />
            <source type="image/avif" srcSet="/img/hero-poster-d-640.avif 640w, /img/hero-poster-d-1280.avif 1280w" sizes="100vw" />
            <source type="image/webp" srcSet="/img/hero-poster-d-640.webp 640w, /img/hero-poster-d-1280.webp 1280w" sizes="100vw" />
            <img src="/img/hero-poster-d-1280.jpg" alt="" width={1280} height={720} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
          <video
            ref={video}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1.4s] ${ready ? "opacity-100" : "opacity-0"}`}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,30,0.55)_0%,rgba(3,19,30,0.05)_30%,rgba(3,19,30,0.15)_55%,rgba(3,19,30,0.85)_100%)]" />
        <div className="absolute inset-0 bg-abyss/30 md:hidden" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="hero-content gutter relative z-10 flex h-full flex-col justify-end pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] md:pb-24">
        <p className="hero-eyebrow eyebrow mb-5 flex items-center gap-3 text-champagne">
          <span className="h-px w-10 bg-champagne" aria-hidden="true" />
          Beloti Travel<span className="hidden sm:inline">&nbsp;· Agência de viagens</span>
        </p>
        <h1>
          <span className="line-mask block">
            <span className="hero-title-line display block text-[clamp(2.9rem,12vw,11.5rem)] uppercase tracking-[-0.035em]">
              O mundo é grande.
            </span>
          </span>
          <span className="line-mask mt-2 block">
            <span className="hero-title-line display block text-[clamp(1.8rem,5.4vw,4.6rem)] italic font-normal leading-[1.02] text-sand/95">
              A sua próxima história começa aqui.
            </span>
          </span>
        </h1>
        <div className="mt-7 flex flex-col gap-8 md:mt-9 md:flex-row md:items-end md:justify-between">
          <p className="hero-sub lede max-w-[34ch] text-sand/85">
            Viagens pensadas para transformar destinos em memórias inesquecíveis.
          </p>
          <div className="hero-cta flex flex-col gap-3 sm:flex-row">
            <a
              href="#planejar"
              className="btn"
              onClick={() => track("hero_cta_click", { cta: "planejar" })}
            >
              Planejar minha viagem
              <svg className="btn-arrow" width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" /></svg>
            </a>
            <a href="#destinos" className="btn btn-ghost" onClick={() => track("hero_cta_click", { cta: "destinos" })}>
              Explorar destinos
            </a>
          </div>
        </div>
      </div>

      {/* HUD sincronizado com o vídeo */}
      <div className="hero-hud absolute right-[var(--gutter)] top-[calc(var(--header-h)+1.5rem)] z-10 hidden items-center gap-4 text-sand/80 md:flex">
        <div className="text-right" aria-live="off">
          <p className="eyebrow text-[0.62rem] text-sand/55">Cena {String(scene + 1).padStart(2, "0")} / 05</p>
          <p key={scene} className="display animate-[fadein_.8s_ease] text-xl italic">{SCENES[scene].label}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-sand/40 transition hover:bg-sand hover:text-ocean"
          aria-label={playing ? "Pausar vídeo de fundo" : "Reproduzir vídeo de fundo"}
        >
          {playing ? (
            <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 0h3v14H1zM8 0h3v14H8z" fill="currentColor" /></svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 0l11 7-11 7z" fill="currentColor" /></svg>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={toggle}
        className="absolute bottom-[max(1.4rem,env(safe-area-inset-bottom))] right-[var(--gutter)] z-10 flex h-10 w-10 items-center justify-center rounded-full text-sand ring-1 ring-sand/40 md:hidden"
        aria-label={playing ? "Pausar vídeo de fundo" : "Reproduzir vídeo de fundo"}
      >
        {playing ? (
          <svg width="10" height="12" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 0h3v14H1zM8 0h3v14H8z" fill="currentColor" /></svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 0l11 7-11 7z" fill="currentColor" /></svg>
        )}
      </button>

      <a href="#manifesto" className="hero-scroll absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 text-sand/70 md:flex" aria-label="Rolar para o próximo capítulo">
        <span className="eyebrow text-[0.6rem]">Role</span>
        <span className="relative block h-12 w-px overflow-hidden bg-sand/25">
          <span className="scroll-line absolute inset-x-0 top-0 h-1/3 bg-champagne" />
        </span>
      </a>

      <div className="hero-next pointer-events-none absolute inset-0 z-10 hidden items-center justify-center md:flex" aria-hidden="true">
        <p className="display text-center text-[clamp(2.5rem,6vw,6rem)] italic leading-none text-sand">
          <span className="eyebrow mb-6 block not-italic text-champagne">Capítulo I</span>
          O mundo está esperando.
        </p>
      </div>
    </section>
  );
}
