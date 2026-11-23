// Resolve caminhos de mídia carregados via JavaScript.
// No site normal devolve o próprio caminho. Na pré-visualização em arquivo único
// (scripts/build-preview.mjs) os arquivos vêm embutidos em window.__ASSETS (base64)
// e são convertidos em blob: URLs sob demanda.
declare global {
  interface Window { __ASSETS?: Record<string, [string, string]> }
}

const cache = new Map<string, string>();

export function asset(path: string): string {
  if (typeof window === "undefined" || !window.__ASSETS) return path;
  const map = window.__ASSETS;
  // a pré-visualização embute só as versões verticais; usa-as como reserva
  const key = map[path] ? path : [path.replace("-d.", "-m."), path.replace("/d/", "/m/")].find((k) => map[k]);
  if (!key) return path;
  const hit = cache.get(key);
  if (hit) return hit;
  const [type, b64] = map[key];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  cache.set(key, url);
  return url;
}

/** srcset/src de imagens fixas: no modo pré-visualização aponta para a variante WebP embutida. */
export function imgSet(set: string): string {
  if (typeof window === "undefined" || !window.__ASSETS) return set;
  const m = set.match(/\/img\/([a-z0-9-]+?)-(?:640|480|960|1280|1920)\.(?:avif|webp|jpg)/);
  if (!m) return set;
  const url = asset(`/img/${m[1]}-${m[1].startsWith("familia") ? 960 : 1280}.webp`);
  return set.includes(" ") ? `${url} 1280w` : url;
}
