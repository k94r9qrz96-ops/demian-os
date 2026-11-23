"use client";
import { useEffect, useRef } from "react";
import { asset } from "@/lib/asset";

type Props = { src: string; poster: string; className?: string };

/** Vídeo decorativo: só baixa ao se aproximar da viewport e pausa fora dela. */
export function LazyVideo({ src, poster, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = asset(src);
          if (!reduce) v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />;
}
