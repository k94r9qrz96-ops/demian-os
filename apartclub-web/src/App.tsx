import { useCallback, useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, reducedMotion, isTouch } from './lib/motion'
import { Intro, shouldShowIntro } from './components/Intro'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Discover } from './components/Discover'
import { Lofts } from './components/Lofts'
import { Experiences } from './components/Experiences'
import { Mirror } from './components/Mirror'
import { Gastro } from './components/Gastro'
import { MapExplorer } from './components/MapExplorer'
import { Booking } from './components/Booking'
import { Trust } from './components/Trust'
import { Finale } from './components/Finale'
import { FloatingCTA } from './components/FloatingCTA'
import { DemoLayer } from './components/DemoLayer'
import { Postales } from './components/Postales'
import { Marquee } from './components/Marquee'
import { Wave } from './components/Wave'
import { Chrome } from './components/Chrome'

export default function App() {
  const [intro] = useState(shouldShowIntro)
  const [ready, setReady] = useState(!intro)
  const done = useCallback(() => setReady(true), [])

  // scroll suave solo en desktop con puntero fino (en iPhone se respeta el scroll nativo)
  useEffect(() => {
    if (reducedMotion() || isTouch()) return
    const lenis = new Lenis({ lerp: 0.1, anchors: true })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0)
    const origScroll = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element) { lenis.scrollTo(this as HTMLElement, { offset: 0, duration: 1.6 }) }
    return () => { gsap.ticker.remove(raf); lenis.destroy(); Element.prototype.scrollIntoView = origScroll }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => ScrollTrigger.refresh(), 600)
    return () => clearTimeout(id)
  }, [ready])

  return (
    <>
      <a className="skip" href="#reservar">Ir a reservas</a>
      {intro && !ready && <Intro onDone={done} />}
      <Header />
      <main>
        <Hero start={ready} />
        <Discover />
        <Postales />
        <Lofts />
        <Experiences />
        <Marquee />
        <Mirror />
        <Wave color="var(--ivory)" />
        <Gastro />
        <Wave color="#0c201b" flip />
        <MapExplorer />
        <Booking />
        <Trust />
        <Finale />
      </main>
      <FloatingCTA />
      <DemoLayer />
      <Chrome />
    </>
  )
}

// Hover magnético moderado en botones (solo puntero fino)
if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  window.addEventListener('pointermove', (e) => {
    const b = (e.target as HTMLElement).closest?.('.btn') as HTMLElement | null
    if (!b) return
    const r = b.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    b.style.setProperty('--mx', `${x}px`); b.style.setProperty('--my', `${y}px`)
    b.style.transform = `translate(${(x / r.width - 0.5) * 6}px, ${(y / r.height - 0.5) * 6}px)`
  }, { passive: true })
  window.addEventListener('pointerout', (e) => {
    const b = (e.target as HTMLElement).closest?.('.btn') as HTMLElement | null
    if (b && !b.contains(e.relatedTarget as Node)) b.style.transform = ''
  }, { passive: true })
}
