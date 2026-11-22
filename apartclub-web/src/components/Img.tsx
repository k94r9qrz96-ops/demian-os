import { pic } from '../data/content'

type Props = { name: string; alt: string; className?: string; sizes?: string; eager?: boolean }

/** Imagen responsive WebP con carga diferida y dimensiones intrínsecas controladas por CSS (sin CLS). */
export function Img({ name, alt, className, sizes = '100vw', eager }: Props) {
  const p = pic(name)
  return <img className={className} src={p.src} srcSet={p.srcSet} sizes={sizes} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}
