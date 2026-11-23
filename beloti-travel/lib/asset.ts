// Resolve caminhos de mídia carregados via JavaScript.
// No site normal devolve o próprio caminho. Nas pré-visualizações em arquivo único
// (scripts/build-preview.mjs) os arquivos vêm embutidos em window.__ASSETS (base64):
// imagens viram data: URLs; vídeos tentam blob: e, se falhar, data:.
declare global {
  interface Window { __ASSETS?: Record<string, [string, string]> }
}

const blobs = new Map<string, string>();

function key(path: string): string | undefined {
  const map = window.__ASSETS!;
  if (map[path]) return path;
  // as pré-visualizações embutem só as versões verticais; usa-as como reserva
  return [path.replace("-d.", "-m."), path.replace("/d/", "/m/")].find((k) => map[k]);
}

export function asset(path: string): string {
  if (typeof window === "undefined" || !window.__ASSETS) return path;
  const k = key(path);
  if (!k) return path;
  const [type, b64] = window.__ASSETS[k];
  return `data:${type};base64,${b64}`;
}

function blobUrl(path: string): string {
  const k = key(path);
  if (!k) return path;
  const hit = blobs.get(k);
  if (hit) return hit;
  const [type, b64] = window.__ASSETS![k];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  blobs.set(k, url);
  return url;
}

/** Define a fonte de um <video>; na pré-visualização tenta blob: e cai para data: se falhar. */
export function setVideoSrc(v: HTMLVideoElement, path: string): void {
  if (typeof window === "undefined" || !window.__ASSETS) { v.src = path; return; }
  const onErr = () => { v.removeEventListener("error", onErr); v.src = asset(path); v.play().catch(() => {}); };
  v.addEventListener("error", onErr);
  try { v.src = blobUrl(path); } catch { onErr(); }
}

/** srcset/src de imagens fixas: no modo pré-visualização aponta para a variante WebP embutida. */
export function imgSet(set: string): string {
  if (typeof window === "undefined" || !window.__ASSETS) return set;
  const m = set.match(/\/img\/([a-z0-9-]+?)-(?:640|480|960|1280|1920)\.(?:avif|webp|jpg)/);
  if (!m) return set;
  const url = asset(`/img/${m[1]}-${m[1].startsWith("familia") ? 960 : 1280}.webp`);
  return set.includes(" ") ? `${url} 1280w` : url;
}
