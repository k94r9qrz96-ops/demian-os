import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { gsap, splitReveal } from '../lib/motion'
import { nightsBetween, openOfficialBooking, openWhatsApp, stayMessage } from '../lib/booking'
import { CONTACT } from '../data/content'
import { track } from '../lib/track'

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d) }
const EXTRAS = [
  { id: 'desayuno', label: 'Desayuno / media pensión' },
  { id: 'masajes', label: 'Masajes' },
  { id: 'experiencias', label: 'Botes, pesca o visitas guiadas' },
]

/**
 * Escena 10: búsqueda de estadía. No hay disponibilidad ficticia:
 * "Ver disponibilidad" abre el motor oficial (Pxsol) y WhatsApp lleva la consulta precargada.
 */
export function Booking() {
  const root = useRef<HTMLElement>(null)
  const today = iso(new Date())
  const [checkIn, setIn] = useState('')
  const [checkOut, setOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [kids, setKids] = useState(0)
  const [loft, setLoft] = useState('any')
  const [pet, setPet] = useState(false)
  const [extras, setExtras] = useState<string[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const nights = nightsBetween(checkIn, checkOut)
  const q = useMemo(() => ({ checkIn, checkOut, adults, kids, loft: loft === 'any' ? undefined : loft, pet, extras: extras.map((e) => EXTRAS.find((x) => x.id === e)!.label.toLowerCase()) }), [checkIn, checkOut, adults, kids, loft, pet, extras])

  useEffect(() => {
    const on = (e: Event) => { const id = (e as CustomEvent<string>).detail; setExtras((x) => (x.includes(id) ? x : [...x, id])) }
    window.addEventListener('ac:extra', on)
    return () => window.removeEventListener('ac:extra', on)
  }, [])

  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      gsap.from(el.querySelector('.bk__card'), { y: 80, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.bk__card'), start: 'top 88%', once: true } })
      gsap.from(el.querySelectorAll('.bk__field'), { y: 20, opacity: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.bk__card'), start: 'top 80%', once: true } })
    })
    return () => mm.revert()
  }, [])

  const validate = () => {
    if (!checkIn || !checkOut) return 'Elegí las fechas de llegada y salida.'
    if (checkIn < today) return 'La fecha de llegada no puede ser anterior a hoy.'
    if (nights < 1) return 'La salida tiene que ser posterior a la llegada.'
    return ''
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate(); setError(err)
    if (err) { track('booking_form_error', { err }); return }
    setStatus('Abrimos el sistema oficial de reservas en otra pestaña. Ingresá las mismas fechas para ver disponibilidad y tarifas en tiempo real.')
    openOfficialBooking('booking_form', q)
  }

  const whatsapp = () => {
    const err = validate()
    if (err && (checkIn || checkOut)) { setError(err); return }
    setError('')
    openWhatsApp('booking_form', stayMessage(q))
  }

  const toggle = (id: string) => setExtras((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))

  return (
    <section ref={root} id="reservar" className="bk" aria-labelledby="bk-title">
      <div className="bk__bg" aria-hidden="true"><img src="./img/piscina-hero-720.webp" alt="" loading="lazy" /></div>
      <div className="bk__head">
        <p className="kicker">Reservas directas</p>
        <h2 id="bk-title" className="display" data-split>Elegí tus fechas. <em>Del resto nos ocupamos.</em></h2>
      </div>
      <form className="bk__card" onSubmit={submit} noValidate>
        <div className="bk__row">
          <label className="bk__field">
            <span>Llegada</span>
            <input type="date" min={today} value={checkIn} onChange={(e) => { const v = e.target.value; setIn(v); if (!checkOut || checkOut <= v) setOut(v ? addDays(v, 2) : '') ; setError('') }} required />
            <small>Check-in desde las {CONTACT.checkIn} h</small>
          </label>
          <label className="bk__field">
            <span>Salida</span>
            <input type="date" min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={(e) => { setOut(e.target.value); setError('') }} required />
            <small>Check-out hasta las {CONTACT.checkOut} h</small>
          </label>
        </div>
        <div className="bk__row">
          <div className="bk__field">
            <span id="lbl-ad">Adultos</span>
            <div className="step" role="group" aria-labelledby="lbl-ad">
              <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} aria-label="Quitar adulto"><Icon name="minus" size={16} /></button>
              <output aria-live="polite">{adults}</output>
              <button type="button" onClick={() => setAdults(Math.min(10, adults + 1))} aria-label="Agregar adulto"><Icon name="plus" size={16} /></button>
            </div>
          </div>
          <div className="bk__field">
            <span id="lbl-kd">Menores</span>
            <div className="step" role="group" aria-labelledby="lbl-kd">
              <button type="button" onClick={() => setKids(Math.max(0, kids - 1))} aria-label="Quitar menor"><Icon name="minus" size={16} /></button>
              <output aria-live="polite">{kids}</output>
              <button type="button" onClick={() => setKids(Math.min(8, kids + 1))} aria-label="Agregar menor"><Icon name="plus" size={16} /></button>
            </div>
          </div>
        </div>
        <label className="bk__field">
          <span>Alojamiento</span>
          <select value={loft} onChange={(e) => setLoft(e.target.value)}>
            <option value="any">Sin preferencia</option>
            <option value="Loft">Loft</option>
            <option value="Loft Deluxe">Loft Deluxe</option>
          </select>
        </label>
        <label className="bk__check">
          <input type="checkbox" checked={pet} onChange={(e) => setPet(e.target.checked)} />
          <span>Viajo con mascota</span>
        </label>
        {pet && loft === 'Loft Deluxe' && <p className="bk__warn" role="alert">El Loft Deluxe no admite mascotas. Elegí otro alojamiento o consultanos.</p>}
        <fieldset className="bk__extras">
          <legend>¿Querés sumar algo? <small>Se confirma por separado</small></legend>
          {EXTRAS.map((x) => (
            <label key={x.id} className={`chip ${extras.includes(x.id) ? 'is-on' : ''}`}>
              <input type="checkbox" checked={extras.includes(x.id)} onChange={() => toggle(x.id)} />{x.label}
            </label>
          ))}
        </fieldset>

        <div className="bk__sum" aria-live="polite">
          {nights > 0 ? <p><b>{nights} noche{nights > 1 ? 's' : ''}</b> · {adults + kids} persona{adults + kids > 1 ? 's' : ''}</p> : <p>Elegí fechas para ver tu estadía.</p>}
        </div>
        {error && <p className="bk__error" role="alert">{error}</p>}
        <div className="bk__actions">
          <button type="submit" className="btn btn--pool btn--lg">Ver disponibilidad <Icon name="arrow" size={18} /></button>
          <button type="button" className="btn btn--line btn--lg" onClick={whatsapp}><Icon name="whatsapp" size={18} />Consultar por WhatsApp</button>
        </div>
        {status && <p className="bk__status" role="status">{status}</p>}
        <p className="bk__fine">La disponibilidad, las tarifas y el pago se gestionan en el sistema oficial de Apart Club San Pedro.</p>
      </form>
    </section>
  )
}
