"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, SplitText, useGSAP, MOTION_OK } from "@/lib/gsap";
import { FAQ } from "@/data/faq";
import { SITE, waLink, WA, mailLink } from "@/lib/site";
import { track } from "@/lib/analytics";
import { asset, imgSet } from "@/lib/asset";
import { Logo } from "./Logo";

function FaqItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0, duration: reduce ? 0 : 0.6, ease: "expo.out" });
  }, [open]);
  return (
    <div className="border-b border-ocean/12">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`faq-${i}`}
          id={`faq-q-${i}`}
          onClick={() => setOpen((o) => !o)}
          className="group flex w-full items-center justify-between gap-6 py-6 text-left"
        >
          <span className="display text-2xl leading-tight md:text-[1.9rem]">{q}</span>
          <span className="relative h-10 w-10 shrink-0 rounded-full ring-1 ring-ocean/20 transition-colors group-hover:bg-ocean group-hover:text-sand" aria-hidden="true">
            <span className="absolute left-1/2 top-1/2 h-px w-3.5 -translate-x-1/2 bg-current" />
            <span className={`absolute left-1/2 top-1/2 h-3.5 w-px -translate-y-1/2 bg-current transition-transform duration-500 ${open ? "rotate-90 scale-0" : ""}`} />
          </span>
        </button>
      </h3>
      <div ref={body} id={`faq-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="h-0 overflow-hidden opacity-0" aria-hidden={!open}>
        <p className="max-w-[68ch] pb-7 text-ocean/72">{a}</p>
      </div>
    </div>
  );
}

export function Closing() {
  const root = useRef<HTMLElement>(null);
  const vid = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const portrait = window.matchMedia("(max-aspect-ratio: 1/1)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!v.src) v.src = asset(portrait ? "/media/sunset-m.mp4" : "/media/sunset-d.mp4");
        if (!reduce) v.play().catch(() => {});
      } else v.pause();
    }, { rootMargin: "300px 0px" });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const split = SplitText.create(".cl-title", {
          type: "lines,words", mask: "lines", autoSplit: true, aria: "none",
          onSplit: (self) => gsap.from(self.words, { yPercent: 120, duration: 1.4, stagger: 0.04, ease: "expo.out", scrollTrigger: { trigger: ".cl-stage", start: "top 60%" } }),
        });
        gsap.from(".cl-fade", { opacity: 0, y: 24, stagger: 0.1, duration: 1, delay: 0.4, scrollTrigger: { trigger: ".cl-stage", start: "top 60%" } });
        gsap.fromTo(".cl-media", { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".cl-stage", start: "top bottom", end: "bottom bottom", scrub: true } });
        gsap.fromTo(".cl-stage", { clipPath: "inset(8% 6% 0% 6% round 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: ".cl-stage", start: "top bottom", end: "top 20%", scrub: true } });
        return () => split.revert();
      });
    },
    { scope: root }
  );

  return (
    <section id="contato" ref={root} className="relative bg-sand" aria-labelledby="cl-title">
      <div className="cl-stage relative flex min-h-[100svh] items-end overflow-hidden bg-abyss text-sand">
        <div className="cl-media absolute inset-0">
          <picture>
            <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet={imgSet("/img/sunset-m-poster-1280.avif")} />
            <source type="image/avif" srcSet={imgSet("/img/sunset-d-poster-1280.avif")} />
            <img src={imgSet("/img/sunset-d-poster-1280.jpg")} alt="" loading="lazy" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
          </picture>
          <video ref={vid} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,30,0.25),rgba(3,19,30,0.15)_40%,rgba(3,19,30,0.88))]" />
        <div className="grain absolute inset-0" />
        <div className="gutter relative mx-auto w-full max-w-[1400px] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] pt-40 md:pb-24">
          <p className="cl-fade eyebrow mb-8 text-champagne">Capítulo VIII · Sua vez</p>
          <h2 id="cl-title" className="cl-title display max-w-[16ch] text-[clamp(2.9rem,7.4vw,7.6rem)] leading-[0.95]">
            Seu próximo destino pode estar mais perto do que você imagina.
          </h2>
          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <a
              href={waLink(WA.fechamento)}
              target="_blank"
              rel="noopener noreferrer"
              className="cl-fade btn w-full !min-h-[64px] !px-7 !text-base sm:w-auto sm:!px-9"
              onClick={() => track("whatsapp_click", { location: "fechamento" })}
            >
              Começar minha próxima viagem
              <span className="sr-only"> (WhatsApp, abre em nova aba)</span>
              <svg className="btn-arrow" width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" /></svg>
            </a>
            <p className="cl-fade text-sand/75">Atendimento das {SITE.hours.replace(" – ", " às ")} · {SITE.phoneDisplay}</p>
          </div>
        </div>
      </div>

      <div className="gutter mx-auto grid max-w-[1400px] gap-12 py-24 text-ocean md:grid-cols-[0.7fr_1.3fr] md:gap-20 md:py-32">
        <div>
          <p className="eyebrow mb-6 text-ocean/55">Perguntas frequentes</p>
          <h2 className="display text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[0.98]">Antes de embarcar, <em className="text-[#9c7a3f]">tire suas dúvidas.</em></h2>
          <p className="mt-6 max-w-[36ch] text-ocean/65">Não encontrou o que procurava? Fale com a gente — respondemos pessoalmente.</p>
        </div>
        <div className="border-t border-ocean/12">
          {FAQ.map((f, i) => <FaqItem key={f.q} q={f.q} a={f.a} i={i} />)}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative bg-ocean pb-[max(7rem,calc(env(safe-area-inset-bottom)+6rem))] pt-20 text-sand md:pb-12">
      <div className="gutter mx-auto max-w-[1400px]">
        <div className="grid gap-12 border-b border-sand/12 pb-14 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <Logo className="w-[200px]" />
            <span className="sr-only">Beloti Travel</span>
            <p className="display mt-6 max-w-[22ch] text-2xl italic text-sand/80">Colecione memórias, programe sua próxima viagem.</p>
          </div>
          <nav aria-label="Serviços">
            <p className="eyebrow mb-5 text-champagne">Serviços</p>
            <ul className="space-y-2.5 text-sand/75">
              {["Passagens aéreas", "Hospedagem", "Cruzeiros", "Seguro viagem", "Transfers", "Passeios", "Viagens corporativas"].map((s) => (
                <li key={s}><a className="ulink" href={s === "Cruzeiros" ? "#cruzeiros" : s === "Viagens corporativas" ? "#corporativo" : "#servicos"}>{s}</a></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Navegação">
            <p className="eyebrow mb-5 text-champagne">Navegue</p>
            <ul className="space-y-2.5 text-sand/75">
              <li><a className="ulink" href="#destinos">Destinos</a></li>
              <li><a className="ulink" href="#historia">Nossa história</a></li>
              <li><a className="ulink" href="#explorar">Explorador</a></li>
              <li><a className="ulink" href="#planejar">Planejar viagem</a></li>
              <li><a className="ulink" href="#contato">Contato</a></li>
            </ul>
          </nav>
          <div>
            <p className="eyebrow mb-5 text-champagne">Contato</p>
            <ul className="space-y-2.5 text-sand/75">
              <li><a className="ulink" href={mailLink("Contato pelo site")}>{SITE.email}</a></li>
              <li><a className="ulink" href={waLink(WA.geral)} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "rodape" })}>WhatsApp {SITE.phoneDisplay}</a></li>
              <li><a className="ulink" href={`tel:${SITE.phoneE164}`}>Ligar: {SITE.phoneDisplay}</a></li>
              <li>{SITE.address}</li>
              <li>Atendimento: {SITE.hours}</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-sand/25 transition hover:bg-sand hover:text-ocean" aria-label="Instagram da Beloti Travel">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>
              </a>
              <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-sand/25 transition hover:bg-sand hover:text-ocean" aria-label="Facebook da Beloti Travel">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1z" /></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-8 text-xs text-sand/50 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Beloti Travel. Todos os direitos reservados.</p>
          <p>Imagens e vídeos de destinos: Pexels (licença Pexels). Fotos da família: acervo Beloti Travel.</p>
        </div>
      </div>
    </footer>
  );
}
