import { useEffect, useRef, useState } from 'react'
import { PLACES } from '../data/content'
import { Icon } from './Icon'
import { gsap, splitReveal, reducedMotion } from '../lib/motion'
import { track } from '../lib/track'

/** Escena 09: explorador de la zona. Esquema ilustrativo (no a escala), solo lugares comprobados. */
export function MapExplorer() {
  const root = useRef<HTMLElement>(null)
  const [sel, setSel] = useState(1)
  const base = PLACES[0]
  const p = PLACES[sel]

  useEffect(() => {
    const el = root.current!
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.querySelectorAll('[data-split]').forEach((h) => splitReveal(h))
      const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector('.map__svg'), start: 'top 75%', once: true } })
      tl.fromTo(el.querySelectorAll('.map__river'), { strokeDashoffset: 300 }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' })
        .fromTo(el.querySelectorAll('.map__road'), { strokeDashoffset: 200 }, { strokeDashoffset: 0, duration: 1.6, stagger: 0.1, ease: 'power2.out' }, 0.3)
        .from(el.querySelectorAll('.map__pt'), { scale: 0, transformOrigin: 'center', stagger: 0.08, duration: 0.6, ease: 'back.out(2)' }, 0.8)
    })
    return () => mm.revert()
  }, [])

  useEffect(() => {
    const el = root.current!
    const line = el.querySelector<SVGPathElement>('.map__link')!
    const len = line.getTotalLength()
    if (!reducedMotion()) {
      gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.1, ease: 'power3.inOut' })
      gsap.fromTo(el.querySelectorAll('.map__card > *'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.8, ease: 'expo.out' })
    }
  }, [sel])

  const mx = (base.x + p.x) / 2 + (p.y - base.y) * 0.25
  const my = (base.y + p.y) / 2 - (p.x - base.x) * 0.25

  return (
    <section ref={root} id="san-pedro" className="map" data-chapter="San Pedro" aria-labelledby="map-title">
      <div className="map__head">
        <p className="kicker">San Pedro y alrededores</p>
        <h2 id="map-title" className="display" data-split>Historia, río y <em>pueblo tranquilo.</em></h2>
      </div>
      <div className="map__grid">
        <div className="map__canvas">
          <svg className="map__svg" viewBox="0 0 100 100" role="img" aria-label="Esquema ilustrativo de San Pedro y alrededores">
            <defs>
              <linearGradient id="riv" x1="0" x2="1"><stop offset="0" stopColor="#23A7C0" stopOpacity=".15" /><stop offset="1" stopColor="#23A7C0" stopOpacity=".55" /></linearGradient>
            </defs>
            <path className="map__river map__river--wide" d="M86 -2 C78 18 92 30 86 48 S76 78 90 102" pathLength={300} />
            <path className="map__river" d="M86 -2 C78 18 92 30 86 48 S76 78 90 102" pathLength={300} />
            <path className="map__road" d="M10 70 C30 66 46 60 58 54" pathLength={200} />
            <path className="map__road" d="M58 54 C64 40 66 28 70 16" pathLength={200} />
            <path className="map__road" d="M30 74 L44 80 M36 66 L30 74" pathLength={200} />
            <path className="map__link" d={`M${base.x} ${base.y} Q${mx} ${my} ${p.x} ${p.y}`} />
            {PLACES.map((pl, k) => (
              <g key={pl.id} className={`map__pt ${k === sel ? 'is-on' : ''} ${k === 0 ? 'is-base' : ''}`} transform={`translate(${pl.x} ${pl.y})`}
                onClick={() => k && setSel(k)} role="presentation">
                <circle className="map__hit" r="6" />
                <circle className="map__pulse" r="5" />
                <circle className="map__dot" r={k === 0 ? 2.8 : 2.1} />
                <text className="map__lbl" x={pl.x > 70 ? -4 : 4} y="1" textAnchor={pl.x > 70 ? 'end' : 'start'}>{pl.id === 'basilica' ? 'Basílica' : pl.id === 'museo' ? 'Museo Paleontológico' : pl.name}</text>
              </g>
            ))}
            <text className="map__label" x="88" y="62" transform="rotate(-80 88 62)">Río Paraná</text>
          </svg>
          <p className="map__fine">Esquema ilustrativo, no a escala.</p>
        </div>
        <div className="map__side">
          <ul className="map__list">
            {PLACES.slice(1).map((pl, k) => (
              <li key={pl.id}>
                <button className={sel === k + 1 ? 'is-on' : ''} aria-pressed={sel === k + 1} onClick={() => { setSel(k + 1); track('map_place', { id: pl.id }) }}>
                  <small>{pl.kind}</small>{pl.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="map__card" aria-live="polite">
            <p className="kicker">{p.kind}</p>
            <h3>{p.name}</h3>
            <p>{p.text}</p>
            <a className="link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`} target="_blank" rel="noopener" onClick={() => track('map_directions', { id: p.id })}>
              <Icon name="pin" size={16} /> Ver en Google Maps
            </a>
          </div>
          <p className="note">Las excursiones se coordinan según disponibilidad, clima, horarios y tarifas vigentes.</p>
        </div>
      </div>
    </section>
  )
}
