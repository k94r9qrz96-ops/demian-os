"use client";
import { useEffect, useState } from "react";
import { CONSENT_KEY, GA_ID } from "@/lib/analytics";

function loadGA() {
  if (!GA_ID || document.getElementById("ga4")) return;
  const s = document.createElement("script");
  s.id = "ga4";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params -- o gtag.js exige o objeto arguments
  window.gtag = function gtag() { window.dataLayer!.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
}

/**
 * Consentimento LGPD. Só é exibido se NEXT_PUBLIC_GA_ID estiver configurado;
 * sem ele, o site não carrega nenhum script de terceiros e não há nada a consentir.
 */
export function Consent() {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!GA_ID) return;
    let v: string | null = null;
    try { v = localStorage.getItem(CONSENT_KEY); } catch { /* ignore */ }
    if (v === "granted") loadGA();
    // leitura do armazenamento do navegador só existe no cliente
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else if (v !== "denied") setAsk(true);
  }, []);
  const decide = (granted: boolean) => {
    try { localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied"); } catch { /* ignore */ }
    setAsk(false);
    if (granted) loadGA();
  };
  if (!ask) return null;
  return (
    <div role="dialog" aria-label="Preferências de privacidade" className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-xl rounded-2xl bg-sand p-5 text-sm text-ocean shadow-2xl ring-1 ring-ocean/10">
      <p>Usamos o Google Analytics para entender, de forma agregada, como o site é utilizado. Você aceita cookies de medição? Você pode mudar de ideia limpando os dados do site.</p>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn btn-dark !min-h-[44px] flex-1" onClick={() => decide(true)}>Aceitar</button>
        <button type="button" className="btn btn-ghost !min-h-[44px] flex-1 !text-ocean ring-1 ring-ocean/30" onClick={() => decide(false)}>Recusar</button>
      </div>
    </div>
  );
}
