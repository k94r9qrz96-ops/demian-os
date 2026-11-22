import { useEffect, useRef } from 'react'
import { WaterImage } from './WaterImage'
import { Img } from './Img'
import { gsap, ScrollTrigger, SplitText, reducedMotion, EASE, fontsReady } from '../lib/motion'
import { goToBooking } from '../lib/booking'
import type { WaterScene } from '../lib/water'

/**
 * Escenas 02 + 03: hero con agua viva y "película" continua al scrollear.
 * El hero queda fijado un tramo corto: el encuadre se reduce, la cámara se acerca al agua,
 * y entran el río y el parque con máscaras (subida y elipse orgánica). Luego se libera.
 */
export function Hero({ start }: { start: boolean }) {
  const root = useRef<HTMLElement>(null)
  const water = useRef<WaterScene | null>(null)

  // Entrada editorial del título (después de la intro)
  useEffect(() => {
    if (!start) return
    const el = root.current!
    if (reducedMotion()) return
    gsap.set(el.querySelector('.hero__copy'), { autoAlpha: 0 })
    let ctx: gsap.Context | undefined
    let dead = false
    fontsReady().then(() => { if (!dead) ctx = gsap.context(() => {
      gsap.set('.hero__copy', { autoAlpha: 1 })
      const l1 = SplitText.create(el.querySelector('.hero__l1')!, { type: 'lines,words', mask: 'lines' })
      const tl = gsap.timeline({ delay: 0.1 })
      tl.from('.hero__frame', { scale: 1.12, duration: 2.4, ease: 'expo.out' }, 0)
        .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1, ease: EASE.out }, 0.2)
        .from(l1.words, { yPercent: 120, duration: 1.4, ease: EASE.out, stagger: 0.06 }, 0.25)
        .from('.hero__l2', { clipPath: 'inset(0 100% 0 0)', x: -30, duration: 1.6, ease: 'expo.inOut' }, 1.0)
        .from('.hero__sub', { y: 20, opacity: 0, duration: 1, ease: EASE.out }, 1.3)
        .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.8)
      // los CTA aparecen enseguida: la reserva nunca espera a la animación
      gsap.from('.hero__ctas > *', { y: 16, opacity: 0, duration: 0.8, stagger: 0.08, ease: EASE.out, delay: 0.35 })
      // una onda en el agua cuando aparece "Se viven."
      gsap.delayedCall(1.3, () => water.current?.splash(0.5, 0.72, 1))
    }, el) })
    return () => { dead = true; ctx?.revert() }
  }, [start])

  // Película al scrollear
  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', small: '(max-width: 767px)' }, (c) => {
      const small = c.conditions?.small
      const w = { zoom: 1.06, offsetY: 0, caustics: 1 }
      const sync = () => { const s = water.current?.state; if (s) { s.zoom = w.zoom; s.offsetY = w.offsetY; s.caustics = w.caustics } }
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: small ? '+=190%' : '+=240%', pin: el.querySelector('.hero__pin'), scrub: 0.6, anticipatePin: 1 },
      })
      tl.to('.hero__copy', { yPercent: -18, opacity: 0, duration: 0.18 }, 0)
        .to('.hero__scroll', { opacity: 0, duration: 0.06 }, 0)
        .to('.hero__frame', { clipPath: small ? 'inset(14% 5% 20% 5% round 22px)' : 'inset(12% 8% 12% 8% round 28px)', duration: 0.3 }, 0.04)
        .to(w, { zoom: 1.45, offsetY: -0.08, caustics: 1.6, duration: 0.4, onUpdate: sync }, 0.04)
        .fromTo('.film__cap--1', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.1 }, 0.16)
        .to('.film__cap--1', { yPercent: -100, opacity: 0, duration: 0.08 }, 0.36)
        .fromTo('.film--2', { clipPath: 'inset(100% 0% 0% 0% round 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.24, ease: 'power2.inOut' }, 0.34)
        .fromTo('.film--2 img', { scale: 1.35, yPercent: 8 }, { scale: 1.05, yPercent: 0, duration: 0.4 }, 0.34)
        .to('.hero__frame', { scale: 0.9, filter: 'brightness(.6)', duration: 0.24 }, 0.34)
        .fromTo('.film__cap--2', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.1 }, 0.5)
        .to('.film__cap--2', { yPercent: -100, opacity: 0, duration: 0.08 }, 0.68)
        .fromTo('.film--3', { clipPath: 'ellipse(0% 0% at 50% 70%)' }, { clipPath: 'ellipse(85% 120% at 50% 70%)', duration: 0.26, ease: 'power2.inOut' }, 0.66)
        .fromTo('.film--3 img', { scale: 1.4 }, { scale: 1.02, duration: 0.34 }, 0.66)
        .to('.film--2 img', { scale: 1.2, duration: 0.26 }, 0.66)
        .fromTo('.film__cap--3', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.1 }, 0.84)
        .fromTo('.film__bar i', { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
      return () => {}
    })
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => { mm.revert(); window.removeEventListener('load', refresh) }
  }, [])

  return (
    <section ref={root} className="hero" id="inicio" aria-label="Bienvenida">
      <div className="hero__pin">
        <div className="hero__frame">
          <WaterImage ref={water} name="piscina-hero" alt="Piscina curva de Apart Club San Pedro con reposeras, frente a los lofts y el parque" priority interactive />
          <div className="hero__shade" aria-hidden="true" />
        </div>

        <figure className="film film--2" aria-hidden="true">
          <Img name="piscina-rio" alt="" />
        </figure>
        <figure className="film film--3" aria-hidden="true">
          <Img name="parque-laguna" alt="" />
        </figure>

        <div className="film__caps" aria-hidden="true">
          <p className="film__cap film__cap--1"><span>01</span> La piscina, protagonista</p>
          <p className="film__cap film__cap--2"><span>02</span> El parque se abre al río</p>
          <p className="film__cap film__cap--3"><span>03</span> Verde, laguna y silencio</p>
        </div>
        <div className="film__bar" aria-hidden="true"><i /></div>

        <div className="hero__copy">
          <p className="hero__eyebrow">San Pedro · Buenos Aires · Río Paraná</p>
          <h1 className="hero__title">
            <span className="hero__l1">Hay lugares que no se visitan.</span>
            <em className="hero__l2">Se viven.</em>
          </h1>
          <p className="hero__sub">Río, naturaleza y momentos para desconectar en San Pedro.</p>
          <div className="hero__ctas">
            <button className="btn btn--pool" onClick={() => goToBooking('hero')}>Reservar mi escapada</button>
            <a className="btn btn--ghost" href="#experiencia" onClick={(e) => { e.preventDefault(); document.getElementById('experiencia')?.scrollIntoView({ behavior: 'smooth' }) }}>Explorar la experiencia</a>
          </div>
        </div>
        <div className="hero__scroll" aria-hidden="true"><span>Deslizá</span><i /></div>
        <p className="hero__hint" aria-hidden="true">Tocá el agua</p>
      </div>
    </section>
  )
}
