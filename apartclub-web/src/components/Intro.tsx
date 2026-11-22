import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../lib/motion'
import { A } from '../lib/asset'

const KEY = 'ac-intro-seen'

export function shouldShowIntro() {
  try { return !sessionStorage.getItem(KEY) && !reducedMotion() } catch { return false }
}

/** Escena 01: revelado líquido del logo. 2,7 s, se puede omitir y no se repite en la sesión. */
export function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    try { sessionStorage.setItem(KEY, '1') } catch { /* modo privado */ }
    const el = root.current!
    document.documentElement.classList.add('is-intro')
    const finish = () => { document.documentElement.classList.remove('is-intro'); onDone() }
    const t = gsap.timeline({ onComplete: finish })
    t.from(el.querySelector('.intro__glow'), { opacity: 0, scale: 0.8, duration: 1.2, ease: 'power2.out' }, 0)
      .fromTo(el.querySelector('.intro__fill'), { y: 380 }, { y: -60, duration: 1.7, ease: 'power2.inOut' }, 0.15)
      .fromTo(el.querySelector('.intro__wave'), { x: 0 }, { x: -1048, duration: 1.9, ease: 'none' }, 0.15)
      .from(el.querySelector('.intro__mirror'), { opacity: 0, duration: 1 }, 0.9)
      .from(el.querySelector('.intro__tag'), { opacity: 0, y: 12, duration: 0.8, ease: 'power3.out' }, 1.2)
      .to(el.querySelector('.intro__stage'), { y: -40, opacity: 0, duration: 0.7, ease: 'power3.in' }, 2.0)
      .to(el, { clipPath: 'ellipse(160% 0% at 50% 0%)', duration: 0.9, ease: 'power3.inOut' }, 2.05)
    tl.current = t
    const skip = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') t.progress(1) }
    window.addEventListener('keydown', skip)
    return () => { window.removeEventListener('keydown', skip); t.kill(); document.documentElement.classList.remove('is-intro') }
  }, [onDone])

  const skip = () => tl.current?.timeScale(4)

  return (
    <div ref={root} className="intro" onClick={skip} role="presentation">
      <div className="intro__glow" aria-hidden="true" />
      <div className="intro__stage">
        <svg className="intro__logo" viewBox="0 0 1048 353" role="img" aria-label="Apart Club San Pedro">
          <defs>
            <clipPath id="liquid">
              <g className="intro__fill">
                <path className="intro__wave" d="M0 30 Q131 0 262 30 T524 30 T786 30 T1048 30 T1310 30 T1572 30 T1834 30 T2096 30 V460 H0 Z" />
              </g>
            </clipPath>
            <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".35" />
              <stop offset=".7" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="mirrorMask"><rect width="1048" height="353" fill="url(#fade)" /></mask>
            <filter id="ripple">
              <feTurbulence type="fractalNoise" baseFrequency="0.004 0.06" numOctaves="1" seed="3">
                <animate attributeName="baseFrequency" dur="6s" values="0.004 0.06;0.006 0.09;0.004 0.06" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="14" />
            </filter>
          </defs>
          <image href={A("./img/logo-light.png")} width="1048" height="353" opacity=".1" />
          <image href={A("./img/logo-light.png")} width="1048" height="353" clipPath="url(#liquid)" />
        </svg>
        <svg className="intro__mirror" viewBox="0 0 1048 353" aria-hidden="true">
          <g mask="url(#mirrorMask)" filter="url(#ripple)">
            <image href={A("./img/logo-light.png")} width="1048" height="353" transform="translate(0 353) scale(1 -1)" />
          </g>
        </svg>
        <p className="intro__tag">The art of escaping</p>
      </div>
      <button className="intro__skip" onClick={(e) => { e.stopPropagation(); tl.current?.progress(1) }}>Omitir intro</button>
    </div>
  )
}
