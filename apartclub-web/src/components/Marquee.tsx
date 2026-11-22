import { useEffect, useRef } from 'react'
import { gsap } from '../lib/motion'

const ROW = ['Piscina', 'Río Paraná', 'Lofts', 'Parque', 'Atardeceres', 'Parrilla']

/** Banda tipográfica: dos filas monumentales que se cruzan con el scroll. */
export function Marquee() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const st = { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      gsap.fromTo(el.querySelector('.mq__row--a'), { xPercent: 0 }, { xPercent: -35, ease: 'none', scrollTrigger: st })
      gsap.fromTo(el.querySelector('.mq__row--b'), { xPercent: -35 }, { xPercent: 0, ease: 'none', scrollTrigger: st })
    })
    return () => mm.revert()
  }, [])
  const line = (k: string) => [...ROW, ...ROW].map((w, i) => <span key={k + i}>{w}<i aria-hidden="true">✦</i></span>)
  return (
    <div ref={root} className="mq" aria-hidden="true">
      <p className="mq__row mq__row--a">{line('a')}</p>
      <p className="mq__row mq__row--b">{line('b')}</p>
    </div>
  )
}
