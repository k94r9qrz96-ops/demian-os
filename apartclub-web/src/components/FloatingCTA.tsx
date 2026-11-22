import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { goToBooking, openWhatsApp } from '../lib/booking'

/** CTA persistente: aparece después del hero y se oculta cuando el formulario de reservas está a la vista. */
export function FloatingCTA() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let bookingVisible = false
    const bk = document.getElementById('reservar')
    const io = new IntersectionObserver(([e]) => { bookingVisible = e.isIntersecting; on() }, { threshold: 0.15 })
    if (bk) io.observe(bk)
    const on = () => setShow(window.scrollY > window.innerHeight * 0.9 && !bookingVisible)
    window.addEventListener('scroll', on, { passive: true }); on()
    return () => { window.removeEventListener('scroll', on); io.disconnect() }
  }, [])
  return (
    <div className={`fcta ${show ? 'is-on' : ''}`} aria-hidden={!show}>
      <button className="fcta__main" tabIndex={show ? 0 : -1} onClick={() => goToBooking('floating')}>
        <span className="fcta__dot" aria-hidden="true" />Reservar mi escapada
      </button>
      <button className="fcta__wa" tabIndex={show ? 0 : -1} aria-label="Consultar por WhatsApp" onClick={() => openWhatsApp('floating', 'Hola! Quiero consultar disponibilidad en Apart Club San Pedro.')}>
        <Icon name="whatsapp" size={22} />
      </button>
    </div>
  )
}
