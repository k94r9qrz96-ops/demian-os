import { useEffect, useState } from 'react'
import { goToBooking } from '../lib/booking'
import { track } from '../lib/track'

const NAV = [
  ['#experiencia', 'El complejo'],
  ['#lofts', 'Lofts'],
  ['#experiencias', 'Experiencias'],
  ['#gastronomia', 'Gastronomía'],
  ['#san-pedro', 'San Pedro'],
  ['#info', 'Información'],
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const go = (href: string) => {
    setOpen(false)
    track('nav_click', { href })
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header className={`hdr ${scrolled ? 'is-scrolled' : ''}`}>
        <a href="#inicio" className="hdr__logo" aria-label="Apart Club San Pedro, inicio" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <img src="./img/logo-light.webp" alt="Apart Club San Pedro" width="1048" height="353" />
        </a>
        <nav className="hdr__nav" aria-label="Principal">
          {NAV.map(([h, l]) => <a key={h} href={h} onClick={(e) => { e.preventDefault(); go(h) }}>{l}</a>)}
        </nav>
        <div className="hdr__actions">
          <button className="btn btn--pool btn--sm" onClick={() => goToBooking('header')}>Reservar</button>
          <button className="hdr__burger" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>
            <span className="sr-only">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
            <i /><i />
          </button>
        </div>
      </header>
      <div id="menu" className={`menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav aria-label="Menú">
          {NAV.map(([h, l], i) => (
            <a key={h} href={h} tabIndex={open ? 0 : -1} style={{ '--i': i } as React.CSSProperties} onClick={(e) => { e.preventDefault(); go(h) }}>
              <small>0{i + 1}</small>{l}
            </a>
          ))}
        </nav>
        <button className="btn btn--pool" tabIndex={open ? 0 : -1} onClick={() => { setOpen(false); goToBooking('menu') }}>Reservar mi escapada</button>
      </div>
    </>
  )
}
