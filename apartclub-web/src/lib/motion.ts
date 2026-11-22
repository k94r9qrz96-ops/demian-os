import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)
ScrollTrigger.config({ ignoreMobileResize: true })

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isTouch = () => window.matchMedia('(hover: none)').matches
export const EASE = { out: 'expo.out', inOut: 'power3.inOut', soft: 'power2.out' }
export { gsap, ScrollTrigger, SplitText }

/** Revela líneas de un título con máscara (cada línea sube desde detrás de su propio recorte). */
export const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 900))])

export function splitReveal(el: Element, opts: gsap.TweenVars & { trigger?: Element | string; start?: string } = {}) {
  // ocultar hasta tener las fuentes definitivas (las líneas se calculan con la tipografía real)
  gsap.set(el, { autoAlpha: 0 })
  fontsReady().then(() => { gsap.set(el, { autoAlpha: 1 }); doSplit(el, opts) })
}

function doSplit(el: Element, opts: gsap.TweenVars & { trigger?: Element | string; start?: string }) {
  const { trigger, start = 'top 82%', ...vars } = opts
  // revelado por letra dentro de máscaras de línea: cada carácter sube, gira y se enfoca (estilo AE)
  const split = SplitText.create(el, { type: 'lines,words,chars', mask: 'lines', linesClass: 'line' })
  const tl = gsap.timeline({ scrollTrigger: { trigger: trigger ?? el, start, once: true } })
  tl.from(split.chars, {
    yPercent: 120, rotateZ: 8, opacity: 0, duration: 1.15, ease: 'expo.out',
    stagger: { each: 0.018, from: 'start' }, transformOrigin: '0% 100%',
    ...vars,
  })
  return tl
}
