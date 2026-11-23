"use client";
import { useEffect, useState } from "react";

/** Só aparece nas pré-visualizações em arquivo único (artefato/demo), nunca no site real. */
export function DemoBadge() {
  const [demo, setDemo] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção só existe no cliente
  useEffect(() => setDemo(!!window.__ASSETS), []);
  if (!demo) return null;
  return (
    <p className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 rounded-full bg-abyss/75 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sand/85 ring-1 ring-sand/20 backdrop-blur-md md:bottom-6 md:left-6">
      Demonstração · Proposta de redesign
    </p>
  );
}
