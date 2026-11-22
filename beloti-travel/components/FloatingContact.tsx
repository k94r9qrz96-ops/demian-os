"use client";
import { useEffect, useState } from "react";
import { waLink, WA } from "@/lib/site";
import { track } from "@/lib/analytics";

/** Botão flutuante discreto: aparece após o hero e some no planejador e no fechamento (onde já há CTAs). */
export function FloatingContact() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hidden = new Set<string>();
    let past = false;
    const update = () => setShow(past && hidden.size === 0);
    const onScroll = () => { past = window.scrollY > window.innerHeight * 0.9; update(); };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? hidden.add(e.target.id) : hidden.delete(e.target.id)));
      update();
    }, { threshold: 0.15 });
    ["planejar", "contato", "cruzeiros"].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <a
      href={waLink(WA.geral)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", { location: "flutuante" })}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-3 rounded-full bg-sand p-1.5 text-sm sm:py-2 sm:pl-2 sm:pr-5 font-bold text-ocean shadow-[0_20px_50px_-15px_rgba(3,19,30,0.55)] ring-1 ring-ocean/10 transition-all duration-700 ease-[var(--ease-cine)] md:bottom-6 md:right-6 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocean text-champagne">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.7-.1 1.3z" /></svg>
      </span>
      <span className="sr-only sm:not-sr-only">Fale conosco</span><span className="sr-only"> pelo WhatsApp (abre em nova aba)</span>
    </a>
  );
}
