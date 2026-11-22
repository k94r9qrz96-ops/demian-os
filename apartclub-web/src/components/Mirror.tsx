import { useEffect, useRef } from 'react'
import { WaterImage } from './WaterImage'
import { gsap } from '../lib/motion'
import type { WaterScene } from '../lib/water'

/**
 * Escena 07: volver al agua. Empezamos dentro del reflejo (la imagen invertida muestra el restaurante
 * "derecho" sobre el agua); al scrollear, el agua se agita, atravesamos la superficie y la cámara
 * sube hasta El Mirador real. Fallback: foto estática con el texto.
 */
export function Mirror() {
  const root = useRef<HTMLElement>(null)
  const water = useRef<WaterScene | null>(null)

  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', small: '(max-width: 767px)' }, (c) => {
      const small = c.conditions?.small
      const st = { zoom: small ? 1.55 : 1.7, offsetX: small ? 0.02 : 0.06, offsetY: -0.2, wave: 0, caustics: 0.6 }
      const sync = () => { const s = water.current?.state; if (s) Object.assign(s, st) }
      sync()
      const iv = setInterval(() => { if (water.current) { sync(); clearInterval(iv) } }, 200)
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: small ? '+=200%' : '+=230%', pin: el.querySelector('.mirror__pin'), scrub: 0.7, anticipatePin: 1 },
      })
      tl.to(st, { zoom: '+=0.3', duration: 0.42, onUpdate: sync }, 0)
        .from('.mirror__t1 .line-in', { yPercent: 110, stagger: 0.04, duration: 0.12 }, 0.02)
        .to('.mirror__t1', { opacity: 0, y: -40, duration: 0.08 }, 0.34)
        .to(st, { wave: 1, caustics: 2, duration: 0.1, ease: 'power2.in', onUpdate: sync }, 0.4)
        .to('.mirror__flash', { opacity: 0.55, duration: 0.1, ease: 'power2.in' }, 0.4)
        .set('.mirror__flip', { scaleY: 1 }, 0.5)
        .set(st, { zoom: 1.7, offsetY: 0.16, offsetX: 0.08, onUpdate: sync }, 0.5)
        .call(sync, [], 0.5)
        .to(st, { wave: 0, caustics: 1, duration: 0.14, ease: 'power2.out', onUpdate: sync }, 0.5)
        .to('.mirror__flash', { opacity: 0, duration: 0.14 }, 0.5)
        .to(st, { zoom: 1.02, offsetY: 0, offsetX: 0, duration: 0.36, ease: 'power1.inOut', onUpdate: sync }, 0.62)
        .from('.mirror__t2 .line-in', { yPercent: 110, stagger: 0.04, duration: 0.12 }, 0.72)
        .from('.mirror__t2 p', { opacity: 0, y: 20, duration: 0.1 }, 0.8)
      return () => clearInterval(iv)
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={root} className="mirror" data-chapter="El Mirador" aria-labelledby="mirror-title">
      <div className="mirror__pin">
        <div className="mirror__flip">
          <WaterImage ref={water} name="piscina-mirador" alt="El restaurante El Mirador reflejado en la piscina al atardecer" />
        </div>
        <div className="mirror__flash" aria-hidden="true" />
        <div className="mirror__shade" aria-hidden="true" />
        <div className="mirror__t1" aria-hidden="true">
          <p className="kicker">El agua otra vez</p>
          <p className="mirror__big"><span className="mask"><span className="line-in">Mirá el reflejo.</span></span><span className="mask"><em className="line-in">Ahora atravesalo.</em></span></p>
        </div>
        <div className="mirror__t2">
          <p className="kicker">Restaurante</p>
          <h2 id="mirror-title" className="mirror__big"><span className="mask"><span className="line-in">El Mirador</span></span></h2>
          <p>Sobre la piscina, con la última luz del día.</p>
        </div>
      </div>
    </section>
  )
}
