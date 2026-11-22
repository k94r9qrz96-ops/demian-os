import { useEffect, useRef } from 'react'
import { Img } from './Img'
import { gsap, splitReveal } from '../lib/motion'

/** Escena 04: editorial con capas a distintas velocidades y un pin corto que se libera solo. */
export function Discover() {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      gsap.utils.toArray<HTMLElement>(el.querySelectorAll('[data-speed]')).forEach((layer) => {
        const sp = parseFloat(layer.dataset.speed!)
        gsap.fromTo(layer, { yPercent: sp * 40 }, { yPercent: -sp * 40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      })
      gsap.fromTo(el.querySelector('.disc__main'), { clipPath: 'inset(18% 12% 18% 12% round 200px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'power2.out',
        scrollTrigger: { trigger: el.querySelector('.disc__stage'), start: 'top 85%', end: 'top 20%', scrub: 0.6 },
      })
      gsap.fromTo(el.querySelector('.disc__main img'), { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el.querySelector('.disc__stage'), start: 'top bottom', end: 'bottom top', scrub: true } })
      // pin corto del texto en desktop
      gsap.matchMedia().add('(min-width: 1024px)', () => {
        gsap.to(el.querySelector('.disc__text'), { scrollTrigger: { trigger: el.querySelector('.disc__stage'), start: 'top 15%', end: '+=45%', pin: el.querySelector('.disc__text'), pinSpacing: false } })
      })
      gsap.from(el.querySelectorAll('.disc__facts li'), { y: 30, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el.querySelector('.disc__facts'), start: 'top 85%', once: true } })
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={root} id="experiencia" className="disc" data-chapter="El complejo" aria-labelledby="disc-title">
      <div className="disc__head">
        <p className="kicker">El complejo</p>
        <h2 id="disc-title" className="display" data-split>Un lugar para <em>bajar el ritmo.</em></h2>
        <p className="lead">Naturaleza, río y tiempo para vos.</p>
      </div>
      <div className="disc__stage">
        <div className="disc__text">
          <p>Lofts sobre el parque, una piscina que se curva entre los árboles y el Paraná de fondo. Cerca del centro de San Pedro, lejos del ruido.</p>
        </div>
        <figure className="disc__main">
          <Img name="balcon-vista" alt="Huésped tomando un café en el balcón con vista al parque, la laguna y las palmeras" sizes="(min-width:1024px) 60vw, 100vw" />
        </figure>
        <figure className="disc__float disc__float--a" data-speed="1.2">
          <Img name="piscina-rio" alt="Puente de madera junto a la piscina, con el muelle y el río al fondo" sizes="40vw" />
        </figure>
        <figure className="disc__float disc__float--b" data-speed="-0.8">
          <Img name="parque-laguna" alt="Parque con laguna y quinchos frente al edificio de lofts" sizes="40vw" />
        </figure>
      </div>
      <ul className="disc__facts">
        <li><b>Lofts</b><span>con balcón y parrilla</span></li>
        <li><b>Piscina</b><span>recreativa con solárium</span></li>
        <li><b>Parque</b><span>laguna, canchas y juegos</span></li>
        <li><b>Río</b><span>Paraná, muelle y paisaje</span></li>
      </ul>
    </section>
  )
}
