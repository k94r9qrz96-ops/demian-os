import { useEffect, useRef, useState } from 'react'
import { LOFT_AMENITIES, LOFT_SPACES } from '../data/content'
import { Icon } from './Icon'
import { gsap, splitReveal, reducedMotion } from '../lib/motion'
import { goToBooking, openOfficialBooking } from '../lib/booking'
import { track } from '../lib/track'

/**
 * Escena 05: recorrido en primera persona. Cada cambio "entra" al siguiente espacio:
 * la foto actual avanza hacia la cámara y se disuelve mientras la nueva se abre desde un portal.
 * Controles táctiles (swipe), teclado y botones; sin depender de hover.
 */
export function Lofts() {
  const root = useRef<HTMLElement>(null)
  const [i, setI] = useState(0)
  const prev = useRef(0)
  const busy = useRef(false)
  const n = LOFT_SPACES.length

  const go = (next: number) => {
    const to = (next + n) % n
    if (to === i || busy.current) return
    track('loft_explore', { space: LOFT_SPACES[to].id })
    prev.current = i
    setI(to)
  }

  useEffect(() => {
    const el = root.current!
    const slides = el.querySelectorAll<HTMLElement>('.lofts__slide')
    const from = slides[prev.current], to = slides[i]
    gsap.set(slides, { zIndex: 0 })
    if (from === to || reducedMotion()) { gsap.set(slides, { autoAlpha: 0 }); gsap.set(to, { autoAlpha: 1, clipPath: 'none' }); return }
    busy.current = true
    gsap.set(from, { zIndex: 1 }); gsap.set(to, { zIndex: 2, autoAlpha: 1 })
    const tl = gsap.timeline({ onComplete: () => { gsap.set(from, { autoAlpha: 0 }); busy.current = false } })
    tl.to(from.querySelector('img'), { scale: 1.35, duration: 1.2, ease: 'power3.in' }, 0)
      .to(from, { filter: 'blur(6px) brightness(.5)', duration: 1.1, ease: 'power2.in' }, 0)
      .fromTo(to, { clipPath: 'circle(0% at 50% 55%)' }, { clipPath: 'circle(75% at 50% 55%)', duration: 1.25, ease: 'expo.inOut' }, 0.1)
      .fromTo(to.querySelector('img'), { scale: 1.5 }, { scale: 1.08, duration: 1.6, ease: 'expo.out' }, 0.1)
      .fromTo(el.querySelector('.lofts__cap'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, 0.6)
    gsap.set(from, { filter: 'none', delay: 1.4 })
    return () => { tl.progress(1) }
  }, [i])

  // Movimiento 2.5D suave (puntero en desktop, scroll en móvil) + entradas de sección
  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      gsap.from(el.querySelector('.lofts__stage'), { clipPath: 'inset(10% 10% 10% 10% round 40px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.lofts__stage'), start: 'top 80%', once: true } })
      gsap.from(el.querySelectorAll('.amen li'), { y: 24, opacity: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.amen'), start: 'top 85%', once: true } })
      gsap.fromTo(el.querySelector('.lofts__cam'), { y: -20 }, { y: 20, ease: 'none', scrollTrigger: { trigger: el.querySelector('.lofts__stage'), start: 'top bottom', end: 'bottom top', scrub: true } })
      const stage = el.querySelector<HTMLElement>('.lofts__stage')!
      const cam = el.querySelector<HTMLElement>('.lofts__cam')!
      const qx = gsap.quickTo(cam, 'rotationY', { duration: 1.2, ease: 'power3' })
      const qy = gsap.quickTo(cam, 'rotationX', { duration: 1.2, ease: 'power3' })
      const move = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        const r = stage.getBoundingClientRect()
        qx(((e.clientX - r.left) / r.width - 0.5) * 5); qy(-((e.clientY - r.top) / r.height - 0.5) * 4)
      }
      stage.addEventListener('pointermove', move)
      return () => stage.removeEventListener('pointermove', move)
    })
    return () => mm.revert()
  }, [])

  // swipe
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: React.PointerEvent) => { touch.current = { x: e.clientX, y: e.clientY } }
  const onUp = (e: React.PointerEvent) => {
    if (!touch.current) return
    const dx = e.clientX - touch.current.x, dy = e.clientY - touch.current.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1))
    touch.current = null
  }

  const s = LOFT_SPACES[i]
  return (
    <section ref={root} id="lofts" className="lofts" aria-labelledby="lofts-title">
      <div className="lofts__head">
        <p className="kicker">Lofts</p>
        <h2 id="lofts-title" className="display" data-split>Entrá. <em>Ya estás de vacaciones.</em></h2>
        <p className="lead">Un recorrido por los espacios reales de nuestros lofts.</p>
      </div>

      <div className="lofts__stage" onPointerDown={onDown} onPointerUp={onUp}
        role="region" aria-roledescription="carrusel" aria-label="Espacios del loft"
        tabIndex={0} onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1) }}>
        <div className="lofts__cam">
          {LOFT_SPACES.map((sp, k) => (
            <figure key={sp.id} className="lofts__slide" style={{ opacity: k === 0 ? 1 : 0, visibility: k === 0 ? 'visible' : 'hidden' }} aria-hidden={k !== i}>
              <img src={sp.src} srcSet={sp.srcSet} sizes="(min-width:1024px) 70vw, 100vw" alt={sp.alt} loading={k === 0 ? 'eager' : 'lazy'} decoding="async" />
            </figure>
          ))}
        </div>
        <div className="lofts__overlay" aria-live="polite">
          <p className="lofts__count"><b>{String(i + 1).padStart(2, '0')}</b> / {String(n).padStart(2, '0')}</p>
          <div className="lofts__cap">
            <h3>{s.title}</h3>
            <p>{s.caption}</p>
          </div>
        </div>
        <div className="lofts__nav">
          <button className="round" onClick={() => go(i - 1)} aria-label="Espacio anterior"><Icon name="left" /></button>
          <button className="round" onClick={() => go(i + 1)} aria-label="Espacio siguiente"><Icon name="arrow" /></button>
        </div>
      </div>

      <div className="lofts__tabs" role="tablist" aria-label="Elegí un espacio">
        {LOFT_SPACES.map((sp, k) => (
          <button key={sp.id} role="tab" aria-selected={k === i} className={k === i ? 'is-on' : ''} onClick={() => go(k)}>
            <img src={sp.src.replace('.webp', '-720.webp')} alt="" loading="lazy" />
            <span>{sp.title}</span>
          </button>
        ))}
      </div>

      <div className="lofts__info">
        <div>
          <h3 className="h3">Equipamiento en cada loft</h3>
          <ul className="amen">
            {LOFT_AMENITIES.map((a) => (
              <li key={a.label}><Icon name={a.icon} size={26} /><span><b>{a.label}</b>{a.detail && <small>{a.detail}</small>}</span></li>
            ))}
          </ul>
        </div>
        <aside className="lofts__aside">
          <p><b>Tipos de loft, capacidad y tarifas</b> se consultan en tiempo real en el sistema oficial de reservas.</p>
          <p className="note">El Loft Deluxe no admite mascotas. Para otros lofts, consultá condiciones.</p>
          <div className="row">
            <button className="btn btn--pool" onClick={() => goToBooking('lofts')}>Consultar disponibilidad</button>
            <button className="btn btn--line" onClick={() => openOfficialBooking('lofts_types')}>Ver tipos y tarifas</button>
          </div>
        </aside>
      </div>
    </section>
  )
}
