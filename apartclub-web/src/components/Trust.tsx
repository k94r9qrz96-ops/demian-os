import { useEffect, useRef, useState } from 'react'
import { CONTACT, POLICIES } from '../data/content'
import { Icon } from './Icon'
import { gsap, splitReveal } from '../lib/motion'
import { track } from '../lib/track'

/**
 * Escena 11: confianza. No se publican reseñas inventadas: las opiniones reales viven en Google y en el
 * módulo de reseñas de Pxsol. SLOT: integrar reseñas verificadas (autor, fecha, puntaje) con autorización.
 */
export function Trust() {
  const root = useRef<HTMLElement>(null)
  const [map, setMap] = useState(false)
  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      gsap.from(el.querySelectorAll('.pol li'), { y: 30, opacity: 0, stagger: 0.07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.pol'), start: 'top 85%', once: true } })
      gsap.fromTo(el.querySelectorAll('.pol li'), { '--line': 0 }, { '--line': 1, stagger: 0.07, duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: el.querySelector('.pol'), start: 'top 85%', once: true } })
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={root} id="info" className="trust" aria-labelledby="trust-title">
      <div className="trust__head">
        <p className="kicker">Antes de venir</p>
        <h2 id="trust-title" className="display" data-split>Información clara, <em>sin letra chica.</em></h2>
      </div>
      <ul className="pol">
        {POLICIES.map((p) => <li key={p.k}><h3>{p.k}</h3><p>{p.v}</p></li>)}
      </ul>
      <div className="trust__grid">
        <div className="trust__reviews">
          <p className="kicker">Opiniones de huéspedes</p>
          <p className="trust__quote">Leé lo que cuentan quienes ya vinieron, en sus propias palabras.</p>
          <a className="btn btn--line" href={CONTACT.reviewsUrl} target="_blank" rel="noopener" onClick={() => track('reviews_click')}>Ver opiniones en Google <Icon name="arrow" size={16} /></a>
        </div>
        <div className="trust__contact">
          <p className="kicker">Contacto</p>
          <a href={CONTACT.phoneHref} onClick={() => track('phone_click')}><Icon name="phone" />{CONTACT.phoneDisplay}</a>
          <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener" onClick={() => track('whatsapp_click', { source: 'trust' })}><Icon name="whatsapp" />WhatsApp</a>
          <a href={`mailto:${CONTACT.email}`} onClick={() => track('email_click')}><Icon name="mail" />{CONTACT.email}</a>
          <a href={CONTACT.mapsUrl} target="_blank" rel="noopener" onClick={() => track('maps_click')}><Icon name="pin" />{CONTACT.address}</a>
        </div>
        <div className="trust__map">
          {map ? (
            <iframe title="Ubicación de Apart Club San Pedro en Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3321.093446898848!2d-59.7399845!3d-33.654740499999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95ba22ef60d03267%3A0x32b1544c02dd1326!2sApart%20Club%20San%20Pedro!5e0!3m2!1ses!2sar!4v1690378602957!5m2!1ses!2sar" />
          ) : (
            <button className="trust__mapbtn" style={{ background: "url(./img/parque-laguna-720.webp) center / cover" }} onClick={() => setMap(true)}><Icon name="pin" size={28} /><span>Cargar mapa interactivo</span></button>
          )}
        </div>
      </div>
    </section>
  )
}
