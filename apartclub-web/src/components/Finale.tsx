import { useEffect, useRef } from 'react'
import { Img } from './Img'
import { Icon } from './Icon'
import { gsap, splitReveal } from '../lib/motion'
import { goToBooking, openWhatsApp } from '../lib/booking'
import { CONTACT, LEGAL } from '../data/content'

/** Escena 12: cierre al atardecer + footer. */
export function Finale() {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h, { start: 'top 75%' }))
      gsap.fromTo(el.querySelector('.fin__img'), { clipPath: 'inset(20% 20% 20% 20% round 400px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: true } })
      gsap.fromTo(el.querySelector('.fin__img img'), { scale: 1.4 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
    })
    return () => mm.revert()
  }, [])

  return (
    <>
      <section ref={root} className="fin" aria-labelledby="fin-title">
        <figure className="fin__img"><Img name="piscina-mirador" alt="La piscina y el restaurante al atardecer" /></figure>
        <div className="fin__shade" aria-hidden="true" />
        <div className="fin__copy">
          <h2 id="fin-title" className="display display--xl" data-split>Tu próxima escapada <em>empieza acá.</em></h2>
          <div className="row row--center">
            <button className="btn btn--pool btn--lg" onClick={() => goToBooking('finale')}>Reservar ahora</button>
            <button className="btn btn--ghost btn--lg" onClick={() => openWhatsApp('finale', 'Hola! Quiero consultar por una escapada en Apart Club San Pedro.')}><Icon name="whatsapp" size={18} />Escribinos</button>
          </div>
        </div>
      </section>
      <footer className="ftr">
        <div className="ftr__top">
          <img className="ftr__logo" src="./img/logo-light.webp" alt="Apart Club San Pedro" width="1048" height="353" loading="lazy" />
          <nav aria-label="Pie de página">
            <a href="#experiencia">El complejo</a><a href="#lofts">Lofts</a><a href="#experiencias">Experiencias</a>
            <a href="#gastronomia">Gastronomía</a><a href="#san-pedro">San Pedro</a><a href="#reservar">Reservar</a>
          </nav>
          <div className="ftr__contact">
            <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <a href={CONTACT.mapsUrl} target="_blank" rel="noopener">Lucio Mansilla 7300, San Pedro</a>
            <div className="ftr__social">
              <a href={CONTACT.instagram} target="_blank" rel="noopener">Instagram</a>
              <a href={CONTACT.facebook} target="_blank" rel="noopener">Facebook</a>
              <a href={CONTACT.youtube} target="_blank" rel="noopener">YouTube</a>
            </div>
          </div>
        </div>
        <p className="ftr__legal">{LEGAL}</p>
        <div className="ftr__bottom">
          <span>© {new Date().getFullYear()} Apart Club San Pedro</span>
          <a href={CONTACT.officialSite} target="_blank" rel="noopener">Términos, privacidad y cookies</a>
          <span>Propuesta de diseño · demo</span>
        </div>
      </footer>
    </>
  )
}
