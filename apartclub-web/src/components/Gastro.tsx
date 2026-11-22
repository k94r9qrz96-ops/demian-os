import { useEffect, useRef, useState } from 'react'
import { MENU } from '../data/content'
import { Img } from './Img'
import { Icon } from './Icon'
import { gsap, splitReveal, reducedMotion } from '../lib/motion'
import { openWhatsApp } from '../lib/booking'
import { track } from '../lib/track'

/** Escena 08: gastronomía editorial + carta visual explorable (sin precios inventados). */
export function Gastro() {
  const root = useRef<HTMLElement>(null)
  const [d, setD] = useState(0)

  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      gsap.fromTo(el.querySelector('.gastro__hero'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el.querySelector('.gastro__hero'), start: 'top 80%', once: true } })
      gsap.fromTo(el.querySelector('.gastro__hero img'), { scale: 1.25, yPercent: -6 }, { scale: 1, yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.querySelector('.gastro__hero'), start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.from(el.querySelectorAll('.gastro__bk > div'), { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.gastro__bk'), start: 'top 85%', once: true } })
    })
    return () => mm.revert()
  }, [])

  useEffect(() => {
    if (reducedMotion()) return
    const card = root.current!.querySelector('.carta__card')!
    gsap.fromTo(card.querySelectorAll('.carta__anim'), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.07, duration: 0.9, ease: 'expo.out' })
  }, [d])

  const dish = MENU[d]
  return (
    <section ref={root} id="gastronomia" className="gastro" aria-labelledby="gastro-title">
      <div className="gastro__head">
        <p className="kicker">Gastronomía</p>
        <h2 id="gastro-title" className="display" data-split>La mesa también es <em>parte del viaje.</em></h2>
      </div>

      <figure className="gastro__hero">
        <Img name="desayuno" alt="Desayuno servido en el loft y en el restaurante: frutas, huevos revueltos, tostadas, dulce, queso, café y jugo" sizes="100vw" />
      </figure>
      <div className="gastro__bk">
        <div><span className="num">01</span><h3>Desayuno en tu loft</h3><p>Para empezar el día sin moverte del balcón.</p></div>
        <div><span className="num">02</span><h3>Desayuno en el resto</h3><p>Mesa servida, café y vista a la piscina.</p></div>
        <div><span className="num">03</span><h3>Media pensión</h3><p>Consultá la opción al reservar. Se confirma por separado.</p></div>
      </div>

      <div className="carta">
        <div className="carta__list" role="tablist" aria-label="Platos de la carta">
          <p className="kicker">De la carta de El Mirador</p>
          {MENU.map((m, k) => (
            <button key={m.id} role="tab" aria-selected={k === d} className={k === d ? 'is-on' : ''} onClick={() => { setD(k); track('menu_dish', { id: m.id }) }}>
              <span>{String(k + 1).padStart(2, '0')}</span>{m.name}
            </button>
          ))}
        </div>
        <div className="carta__card" role="tabpanel" aria-live="polite">
          <div className="carta__bg"><Img name="piscina-mirador" alt="" sizes="50vw" /></div>
          <div className="carta__inner">
            <p className="carta__anim carta__cat">{dish.cat}</p>
            <h3 className="carta__anim">{dish.name}</h3>
            <p className="carta__anim">{dish.line}</p>
            <p className="carta__anim carta__fine">Disponibilidad y precios según la carta vigente.</p>
          </div>
        </div>
      </div>

      <div className="gastro__foot">
        <p className="note">El Mirador tiene gestión gastronómica independiente. Platos, horarios y disponibilidad sujetos a confirmación.</p>
        <button className="btn btn--night" onClick={() => openWhatsApp('gastro', 'Hola! Quiero consultar por la experiencia gastronómica (desayuno, media pensión o El Mirador).')}>
          <Icon name="whatsapp" size={18} />Consultar experiencia gastronómica
        </button>
      </div>
    </section>
  )
}
