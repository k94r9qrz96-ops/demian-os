import { useEffect, useRef } from 'react'
import { Img } from './Img'
import { gsap, splitReveal } from '../lib/motion'

const CARDS = [
  { img: 'piscina-hero', t: 'La piscina al mediodía', n: 'Solárium' },
  { img: 'piscina-rio', t: 'El muelle y el río', n: 'Paraná' },
  { img: 'balcon-vista', t: 'Café en el balcón', n: 'Lofts' },
  { img: 'parque-laguna', t: 'La laguna del parque', n: 'Parque' },
  { img: 'botes', t: 'Remar sin apuro', n: 'Botes' },
  { img: 'piscina-mirador', t: 'El Mirador al atardecer', n: 'Restaurante' },
]

/**
 * Galería horizontal fijada: el scroll vertical desplaza la cinta, cada foto tiene parallax interno
 * y la cinta se inclina levemente según la velocidad del scroll.
 */
export function Postales() {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      const track = el.querySelector<HTMLElement>('.post__track')!
      const dist = () => track.scrollWidth - window.innerWidth + 32
      const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' })
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: el, start: 'top top', end: () => '+=' + dist(), pin: el.querySelector('.post__pin'), scrub: 0.8,
          invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => skew(gsap.utils.clamp(-5, 5, self.getVelocity() / -320)),
          onLeave: () => skew(0), onLeaveBack: () => skew(0),
        },
      })
      el.querySelectorAll<HTMLElement>('.post__card').forEach((card) => {
        gsap.fromTo(card.querySelector('img'), { xPercent: -14 }, {
          xPercent: 14, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        })
        gsap.from(card.querySelector('.post__cap'), { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 75%' } })
      })
      gsap.to(el.querySelector('.post__bar i'), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: () => '+=' + dist(), scrub: true } })
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={root} className="post" data-chapter="Postales" aria-labelledby="post-title">
      <div className="post__pin">
        <div className="post__head">
          <p className="kicker">Postales</p>
          <h2 id="post-title" className="display" data-split>Así se ve <em>un día acá.</em></h2>
        </div>
        <div className="post__track">
          {CARDS.map((c, i) => (
            <figure key={c.img} className={`post__card post__card--${i % 3}`}>
              <div className="post__img"><Img name={c.img} alt={c.t} sizes="(min-width:1024px) 40vw, 78vw" /></div>
              <figcaption className="post__cap"><span>{String(i + 1).padStart(2, '0')} · {c.n}</span>{c.t}</figcaption>
            </figure>
          ))}
        </div>
        <div className="post__bar" aria-hidden="true"><i /></div>
      </div>
    </section>
  )
}
