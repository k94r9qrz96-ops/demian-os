import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { WaterScene, canUseWater } from '../lib/water'
import { A, srcset } from '../lib/asset'

type Props = {
  name: 'piscina-hero' | 'piscina-mirador'
  alt: string
  priority?: boolean
  interactive?: boolean
  intensity?: number
  className?: string
}

/**
 * Foto real + capa WebGL de agua. La <img> se pinta primero (LCP inmediato y fallback);
 * el canvas aparece encima con un fundido cuando el shader está listo.
 */
export const WaterImage = forwardRef<WaterScene | null, Props>(function WaterImage(
  { name, alt, priority, interactive, intensity = 1, className = '' }, ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<WaterScene | null>(null)
  const [live, setLive] = useState(false)
  useImperativeHandle(ref, () => scene.current as WaterScene, [live])

  useEffect(() => {
    if (!canvas.current || !canUseWater()) return
    let s: WaterScene | null = null
    let cancelled = false
    const boot = () => {
      if (cancelled || !canvas.current) return
      try {
        s = new WaterScene(canvas.current, { image: A(`./img/${name}.jpg`), mask: A(`./img/${name}-mask.png`), interactive, intensity })
        scene.current = s
        s.ready.then(() => !cancelled && setLive(true)).catch(() => {})
      } catch { /* sin WebGL: queda la foto estática */ }
    }
    // no competir con el LCP: arrancar el shader cuando el hilo principal está libre
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number }).requestIdleCallback
    if (priority) setTimeout(boot, 60)
    else if (idle) idle(boot, { timeout: 1200 })
    else setTimeout(boot, 300)
    return () => { cancelled = true; s?.destroy(); scene.current = null }
  }, [name, interactive, intensity, priority])

  return (
    <div className={`water ${live ? 'is-live' : ''} ${className}`}>
      <img
        className="water__img"
        src={A(`./img/${name}.webp`)}
        srcSet={srcset(`./img/${name}-720.webp 720w, ./img/${name}.webp 1290w`)}
        sizes="100vw"
        alt={alt}
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <canvas ref={canvas} className="water__gl" aria-hidden="true" />
    </div>
  )
})
