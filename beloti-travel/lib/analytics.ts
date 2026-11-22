// Ponto único de analytics. Eventos previstos:
// hero_cta_click, destination_click, cruise_cta_click, trip_planner_start,
// trip_planner_complete, whatsapp_click (+ corporate_cta_click, region_select).
//
// Sem NEXT_PUBLIC_GA_ID, NADA é enviado a terceiros: o evento só é disparado
// localmente como CustomEvent("beloti:track") para depuração/integrações futuras.
// Com GA4 configurado, o envio acontece somente após consentimento (ver ConsentBanner).

export type TrackEvent =
  | "hero_cta_click"
  | "destination_click"
  | "cruise_cta_click"
  | "corporate_cta_click"
  | "trip_planner_start"
  | "trip_planner_step"
  | "trip_planner_complete"
  | "region_select"
  | "whatsapp_click";

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const CONSENT_KEY = "beloti-consent-v1";

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function track(event: TrackEvent, params: Params = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("beloti:track", { detail: { event, ...params } }));
  if (GA_ID && hasConsent() && typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
  if (process.env.NODE_ENV !== "production") console.debug("[track]", event, params);
}
