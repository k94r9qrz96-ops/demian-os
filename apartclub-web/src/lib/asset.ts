/**
 * Resolución de medios. En el build normal devuelve la ruta tal cual.
 * En la versión de archivo único (scripts/single-file.py) las imágenes viajan embebidas en
 * window.__AC_ASSETS y se resuelven acá; en ese modo no se usa srcset.
 */
type W = Window & { __AC_ASSETS?: Record<string, string> }
const map = () => (typeof window !== 'undefined' ? (window as W).__AC_ASSETS : undefined)
export const A = (p: string) => map()?.[p] ?? p
export const srcset = (s: string) => (map() ? undefined : s)
