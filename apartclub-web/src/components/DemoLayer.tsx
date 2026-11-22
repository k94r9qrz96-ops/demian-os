import { useEffect, useState } from 'react'
import { DEMO } from '../lib/booking'

/** Versión demo: sello permanente "propuesta no oficial" y avisos en lugar de acciones reales. */
export function DemoLayer() {
  const [t, setT] = useState<{ title: string; body: string } | null>(null)
  useEffect(() => {
    let id = 0
    const on = (e: Event) => { setT((e as CustomEvent).detail); clearTimeout(id); id = window.setTimeout(() => setT(null), 6000) }
    window.addEventListener('ac:toast', on)
    return () => window.removeEventListener('ac:toast', on)
  }, [])
  if (!DEMO) return null
  return (
    <>
      <div className="demo-seal" role="note">Propuesta de diseño · no es el sitio oficial</div>
      <div className={`demo-toast ${t ? 'is-on' : ''}`} role="status" aria-live="polite">
        {t && <><b>{t.title}</b>{t.body && <pre>{t.body}</pre>}<button onClick={() => setT(null)}>Entendido</button></>}
      </div>
    </>
  )
}
