/**
 * Analítica preparada (NO conectada). Empuja eventos a window.dataLayer para que
 * Google Tag Manager / GA4 los tome cuando se configure un contenedor real.
 */
type Payload = Record<string, string | number | boolean | undefined>
declare global { interface Window { dataLayer?: unknown[] } }

export function track(event: string, payload: Payload = {}) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...payload })
  if (import.meta.env.DEV) console.debug('[track]', event, payload)
}
