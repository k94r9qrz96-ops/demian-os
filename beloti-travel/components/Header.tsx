"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";
import { Logo } from "./Logo";
import { waLink, WA } from "@/lib/site";
import { track } from "@/lib/analytics";

const NAV = [
  { href: "#destinos", label: "Destinos" },
  { href: "#cruzeiros", label: "Cruzeiros" },
  { href: "#servicos", label: "Serviços" },
  { href: "#corporativo", label: "Corporativo" },
  { href: "#historia", label: "Nossa história" },
  { href: "#explorar", label: "Explorar" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 400 && y > last + 4);
      if (y < last - 4) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        tl.current = gsap
          .timeline({ paused: true })
          .set(menuRef.current, { visibility: "visible" })
          .fromTo(menuRef.current, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "expo.inOut" })
          .from(".m-link", { yPercent: 110, duration: 0.8, stagger: 0.06, ease: "expo.out" }, "-=0.3")
          .from(".m-foot", { opacity: 0, y: 16, duration: 0.6 }, "-=0.5");
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        tl.current = gsap.timeline({ paused: true }).set(menuRef.current, { visibility: "visible", clipPath: "none" });
      });
    },
    { scope: menuRef }
  );

  useEffect(() => {
    if (!tl.current) return;
    if (open) {
      tl.current.timeScale(1).play();
      document.documentElement.style.overflow = "hidden";
      const first = menuRef.current?.querySelector<HTMLElement>("a");
      setTimeout(() => first?.focus(), 350);
    } else {
      tl.current.timeScale(1.6).reverse();
      document.documentElement.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,backdrop-filter] duration-700 ease-[var(--ease-cine)] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled && !open ? "bg-abyss/70 backdrop-blur-xl" : "bg-transparent"}`}
      >
        <div className="gutter flex h-[var(--header-h)] items-center justify-between gap-6">
          <a href="#inicio" className="relative z-10 block w-[150px] md:w-[178px]" aria-label="Beloti Travel">
            <Logo />
          </a>
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-8 text-[0.86rem] font-semibold text-sand/85">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a className="ulink py-1 hover:text-sand" href={n.href}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="relative z-10 flex items-center gap-3">
            <a href="#planejar" className="btn hidden !min-h-[44px] !px-5 text-[0.85rem] md:inline-flex">
              Planejar viagem
            </a>
            <button
              ref={btnRef}
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full text-sand ring-1 ring-sand/35 backdrop-blur lg:hidden"
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="relative block h-3 w-5">
                <span className={`absolute left-0 top-0 h-[1.5px] w-full bg-current transition-transform duration-500 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
                <span className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-current transition-transform duration-500 ${open ? "-translate-y-[5.5px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        ref={menuRef}
        id="menu-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        className="invisible fixed inset-0 z-40 flex flex-col justify-between bg-ocean pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(var(--header-h)+2rem)] text-sand lg:hidden"
      >
        <nav aria-label="Menu móvel" className="gutter">
          <ul className="space-y-1">
            {[...NAV, { href: "#planejar", label: "Planejar viagem" }].map((n, i) => (
              <li key={n.href} className="line-mask">
                <a
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="m-link display flex items-baseline gap-4 py-1.5 text-[clamp(2.4rem,11vw,3.6rem)]"
                >
                  <span className="font-sans text-xs tracking-[0.2em] text-champagne">0{i + 1}</span>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="m-foot gutter space-y-4">
          <a
            href={waLink(WA.geral)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn w-full"
            onClick={() => track("whatsapp_click", { location: "menu" })}
          >
            Falar no WhatsApp
          </a>
          <p className="text-center text-sm text-sand/60">Atendimento das 9h às 22h</p>
        </div>
      </div>
    </>
  );
}
