import { useEffect, useRef } from 'react'
import { gsap } from '../lib/motion'

const FLAT = 'M0 120 C240 120 480 120 720 120 C960 120 1200 120 1440 120 L1440 120 L0 120 Z'
const WAVE = 'M0 120 C240 30 480 10 720 60 C960 110 1200 20 1440 70 L1440 120 L0 120 Z'

/** Borde de agua entre secciones: la ola crece al entrar en pantalla. `color` = la sección que sigue. */
export function Wave({ color, flip }: { color: string; flip?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const el = ref.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(el.querySelector('path'), { attr: { d: FLAT } }, { attr: { d: WAVE }, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom 40%', scrub: 0.8 } })
    })
    return () => mm.revert()
  }, [])
  return (
    <svg ref={ref} className={`wave ${flip ? 'wave--flip' : ''}`} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <path d={WAVE} fill={color} />
    </svg>
  )
}
