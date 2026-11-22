import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/motion'

/** Acabado: grano de película, barra de progreso y capítulo actual. */
export function Chrome() {
  const bar = useRef<HTMLDivElement>(null)
  const [chap, setChap] = useState<{ n: string; t: string } | null>(null)
  useEffect(() => {
    const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => gsap.set(bar.current, { scaleX: s.progress }) })
    const secs = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
    const trig = secs.map((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (x) => x.isActive && setChap({ n: String(i + 1).padStart(2, '0'), t: s.dataset.chapter! }) }))
    return () => { st.kill(); trig.forEach((t) => t.kill()) }
  }, [])
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="progress" aria-hidden="true"><div ref={bar} /></div>
      <p className={`chap ${chap ? 'is-on' : ''}`} aria-hidden="true"><b key={chap?.n}>{chap?.n}</b><span key={chap?.t}>{chap?.t}</span></p>
    </>
  )
}
