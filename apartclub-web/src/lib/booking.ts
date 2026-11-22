import { CONTACT } from '../data/content'
import { track } from './track'

export type StayQuery = {
  checkIn?: string
  checkOut?: string
  adults?: number
  kids?: number
  loft?: string
  pet?: boolean
  extras?: string[]
}

const fmt = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const nightsBetween = (a?: string, b?: string) => {
  if (!a || !b) return 0
  const ms = new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

/** Abre en pestaña nueva; si el navegador la bloquea, navega en la misma pestaña. */
export const DEMO = import.meta.env.VITE_DEMO === '1'

/** Aviso flotante (lo muestra <DemoLayer/>). */
export function toast(title: string, body = '') {
  window.dispatchEvent(new CustomEvent('ac:toast', { detail: { title, body } }))
}

function openExternal(url: string) {
  if (DEMO) {
    const wa = url.includes('wa.me')
    const text = wa ? decodeURIComponent(url.split('text=')[1] ?? '') : ''
    toast(wa ? 'En la web real se abre WhatsApp con este mensaje' : 'En la web real se abre el sistema oficial de reservas', text)
    return
  }
  // equivalente a tocar un enlace real: funciona también en visores con ventanas emergentes restringidas
  const a = document.createElement('a')
  a.href = url; a.target = '_blank'; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
}

export function stayMessage(q: StayQuery) {
  const lines = ['Hola! Quiero consultar disponibilidad en Apart Club San Pedro.']
  if (q.checkIn && q.checkOut) lines.push(`Fechas: ${fmt(q.checkIn)} al ${fmt(q.checkOut)} (${nightsBetween(q.checkIn, q.checkOut)} noches)`)
  if (q.adults) lines.push(`Personas: ${q.adults} adulto${q.adults > 1 ? 's' : ''}${q.kids ? ` y ${q.kids} menor${q.kids > 1 ? 'es' : ''}` : ''}`)
  if (q.loft && q.loft !== 'any') lines.push(`Alojamiento: ${q.loft}`)
  if (q.pet) lines.push('Viajo con mascota (consulto condiciones).')
  if (q.extras?.length) lines.push(`También me interesa consultar: ${q.extras.join(', ')}.`)
  return lines.join('\n')
}

/**
 * Abre el motor oficial (Pxsol). No se pasan fechas por URL porque el formato de parámetros
 * del motor no está documentado públicamente: integrar cuando Pxsol confirme el deep-link.
 */
export function openOfficialBooking(source: string, q?: StayQuery) {
  track('booking_click', { source, checkIn: q?.checkIn, checkOut: q?.checkOut, adults: q?.adults })
  openExternal(CONTACT.bookingUrl)
}

export function openWhatsApp(source: string, message: string) {
  track('whatsapp_click', { source })
  openExternal(whatsappUrl(message))
}

export function goToBooking(source: string, extra?: string) {
  track('booking_section_nav', { source, extra })
  if (extra) window.dispatchEvent(new CustomEvent('ac:extra', { detail: extra }))
  document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
