import { useEffect, useRef, useState } from 'react'
import { EXPERIENCES, type Experience } from '../data/content'
import { Img } from './Img'
import { Icon } from './Icon'
import { gsap, ScrollTrigger, splitReveal, reducedMotion } from '../lib/motion'
import { goToBooking, openWhatsApp } from '../lib/booking'
import { track } from '../lib/track'

const FX: Record<Experience['fx'], [gsap.TweenVars, gsap.TweenVars]> = {
  circle: [{ clipPath: 'circle(0% at 50% 60%)' }, { clipPath: 'circle(90% at 50% 60%)' }],
  wipe: [{ clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }],
  rise: [{ clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }],
  blinds: [{ clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }],
  diamond: [{ clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)' }, { clipPath: 'polygon(50% -60%, 160% 50%, 50% 160%, -60% 50%)' }],
  zoom: [{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1 }],
}

function Art({ kind }: { kind: 'rings' | 'route' }) {
  // Composición tipográfica/gráfica para experiencias sin foto propia.
  // MEDIA SLOT: reemplazar por fotografía real autorizada del servicio cuando esté disponible.
  if (kind === 'rings')
    return (
      <svg className="art art--rings" viewBox="0 0 400 400" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx="200" cy="200" r={40 + k * 34} style={{ animationDelay: `${k * 0.6}s` }} />)}
      </svg>
    )
  return (
    <svg className="art art--route" viewBox="0 0 400 400" aria-hidden="true">
      <path className="art__river" d="M330 0 C300 90 360 160 320 240 S300 360 340 400" />
      <path className="art__path" d="M90 330 C140 300 150 240 200 220 S260 120 290 70" />
      <circle cx="90" cy="330" r="7" /><circle cx="290" cy="70" r="7" />
      <text x="70" y="362">Centro histórico</text><text x="200" y="52">Vuelta de Obligado</text>
    </svg>
  )
}

/** Escena 06: Experience Explorer. Escenario fijo + índice; se activa al tocar o al recorrer con el scroll. */
export function Experiences() {
  const root = useRef<HTMLElement>(null)
  const [a, setA] = useState(0)
  const first = useRef(true)

  useEffect(() => {
    const el = root.current!
    const panels = el.querySelectorAll<HTMLElement>('.xp__panel')
    const p = panels[a]
    const fx = FX[EXPERIENCES[a].fx]
    panels.forEach((x, k) => { x.style.zIndex = k === a ? '2' : '1'; x.setAttribute('aria-hidden', String(k !== a)) })
    if (first.current || reducedMotion()) {
      first.current = false
      gsap.set(panels, { autoAlpha: 0 }); gsap.set(p, { autoAlpha: 1, clipPath: 'none' }); return
    }
    gsap.killTweensOf(p)
    const tl = gsap.timeline({ onComplete: () => panels.forEach((x, k) => k !== a && gsap.set(x, { autoAlpha: 0 })) })
    tl.set(p, { autoAlpha: 1 })
      .fromTo(p, fx[0], { ...fx[1], duration: 1.1, ease: 'expo.inOut' }, 0)
      .fromTo(p.querySelector('.xp__media'), { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0)
      .from(p.querySelectorAll('.xp__txt > *'), { y: 30, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'expo.out' }, 0.35)
    return () => { tl.progress(1) }
  }, [a])

  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      gsap.from(el.querySelectorAll('.xp__item'), { x: -30, opacity: 0, stagger: 0.04, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.xp__list'), start: 'top 85%', once: true } })
    })
    // recorrer con el scroll activa cada experiencia (sin bloquear el scroll)
    const items = el.querySelectorAll<HTMLElement>('.xp__item')
    const triggers = Array.from(items).map((it, k) => ScrollTrigger.create({
      trigger: it, start: 'top 76%', end: 'bottom 76%',
      onToggle: (self) => { if (self.isActive) setA(k) },
    }))
    return () => { mm.revert(); triggers.forEach((t) => t.kill()) }
  }, [])

  const pick = (k: number) => { setA(k); track('experience_open', { id: EXPERIENCES[k].id }) }

  return (
    <section ref={root} id="experiencias" className="xp" style={{ '--tint': EXPERIENCES[a].tint } as React.CSSProperties} aria-labelledby="xp-title">
      <div className="xp__head">
        <p className="kicker">Experiencias</p>
        <h2 id="xp-title" className="display" data-split>Elegí cómo querés <em>vivir San Pedro.</em></h2>
      </div>
      <div className="xp__grid">
        <div className="xp__stage">
          {EXPERIENCES.map((x, k) => (
            <article key={x.id} className={`xp__panel ${x.image ? '' : 'xp__panel--art'}`} id={`xp-${x.id}`}>
              <div className="xp__media">
                {x.image ? <Img name={x.image} alt={x.alt ?? ''} sizes="(min-width:1024px) 55vw, 100vw" /> : <Art kind={x.art!} />}
              </div>
              <div className="xp__txt">
                <p className="xp__kick">{String(k + 1).padStart(2, '0')} · {x.kicker}</p>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
                {x.note && <p className="xp__note">{x.note}</p>}
                <div className="row">
                  <button className="btn btn--pool btn--sm" onClick={() => openWhatsApp(`xp_${x.id}`, x.cta.message)}><Icon name="whatsapp" size={16} />{x.cta.label}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => goToBooking(`xp_${x.id}`, x.cta.extra)}>Ver fechas</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <ol className="xp__list">
          {EXPERIENCES.map((x, k) => (
            <li key={x.id} className={`xp__item ${k === a ? 'is-on' : ''}`}>
              <button onClick={() => pick(k)} aria-controls={`xp-${x.id}`} aria-pressed={k === a}>
                <span className="xp__n">{String(k + 1).padStart(2, '0')}</span>
                <span className="xp__t">{x.title}</span>
                <Icon name="arrow" size={18} />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
