import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'x-requested-with': 'demian-os', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) {
    const e = new Error(data?.error || `Error ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}

export function useApi(path, deps = []) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async () => {
    if (!path) return;
    try { const data = await api(path); set({ data, error: null, loading: false }); }
    catch (e) { set((s) => ({ data: s.data, error: e.message, loading: false })); }
  }, [path]);
  useEffect(() => { load(); }, [load, ...deps]);
  return { ...state, reload: load };
}

export const STATUS = {
  available: { label: 'Disponible', c: 'var(--st-available)' },
  queued: { label: 'En cola', c: 'var(--st-queued)' },
  working: { label: 'Trabajando', c: 'var(--st-working)' },
  running: { label: 'Trabajando', c: 'var(--st-working)' },
  waiting_approval: { label: 'Esperando aprobación', c: 'var(--st-waiting)' },
  blocked: { label: 'Bloqueado', c: 'var(--st-blocked)' },
  failed: { label: 'Falló', c: 'var(--st-failed)' },
  completed: { label: 'Completado', c: 'var(--st-completed)' },
  cancelled: { label: 'Cancelada', c: 'var(--st-available)' },
  needs_attention: { label: 'Requiere atención', c: 'var(--st-waiting)' },
  planning: { label: 'Planificando', c: 'var(--st-queued)' },
  pending: { label: 'Pendiente', c: 'var(--st-waiting)' },
  approved: { label: 'Aprobada', c: 'var(--st-queued)' },
  executing: { label: 'Ejecutando', c: 'var(--st-working)' },
  executed: { label: 'Ejecutada', c: 'var(--st-completed)' },
  rejected: { label: 'Rechazada', c: 'var(--st-available)' },
  expired: { label: 'Vencida', c: 'var(--st-available)' },
  connected: { label: 'Conectada', c: 'var(--st-working)' },
  pending_auth: { label: 'Pendiente de autorización', c: 'var(--st-waiting)' },
  insufficient_permissions: { label: 'Permisos insuficientes', c: 'var(--st-blocked)' },
  error: { label: 'Error', c: 'var(--st-failed)' },
  unavailable: { label: 'No disponible', c: 'var(--st-available)' },
};
export const STATUS_HEX = { available: '#8a93a3', queued: '#7aa2f7', working: '#3ddc97', waiting_approval: '#f5b544', blocked: '#ff8a3d', failed: '#ff5c5c', completed: '#9be15d' };

export function Status({ s, live }) {
  const m = STATUS[s] || { label: s, c: 'var(--dim)' };
  return <span className={`status ${live || s === 'working' || s === 'running' ? 'live' : ''}`} style={{ '--c': m.c }}><i />{m.label}</span>;
}

export function ago(iso) {
  if (!iso) return '';
  const t = Date.parse(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 0) { const f = -s; return f < 3600 ? `en ${Math.round(f / 60)} min` : f < 86400 ? `en ${Math.round(f / 3600)} h` : `en ${Math.round(f / 86400)} d`; }
  if (s < 45) return 'recién';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}
export function fmtDate(iso) {
  if (!iso) return '—';
  const t = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return t.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' });
}
export const usd = (n) => `US$ ${Number(n || 0).toFixed(n >= 1 ? 2 : 4)}`;

// ---- Estado en vivo: SSE + oficina ----
const LiveCtx = createContext(null);
export function LiveProvider({ children }) {
  const [office, setOffice] = useState(null);
  const [events, setEvents] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set());
  const reloadTimer = useRef(null);

  const reloadOffice = useCallback(async () => {
    try { setOffice(await api('/office')); } catch { /* sin sesión */ }
  }, []);
  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(reloadOffice, 250);
  }, [reloadOffice]);

  useEffect(() => {
    reloadOffice();
    api('/events?limit=60').then((e) => setEvents(e)).catch(() => {});
    let es;
    let retry;
    const open = () => {
      es = new EventSource('/api/events/stream');
      es.onopen = () => setConnected(true);
      es.onerror = () => { setConnected(false); es.close(); retry = setTimeout(open, 3000); };
      es.onmessage = (m) => {
        const ev = JSON.parse(m.data);
        setEvents((prev) => (prev.some((p) => p.id === ev.id) ? prev : [ev, ...prev].slice(0, 300)));
        listeners.current.forEach((fn) => fn(ev));
        if (ev.type.startsWith('task.') || ev.type.startsWith('approval.') || ev.type.startsWith('automations.') || ev.type.startsWith('integration.') || ev.type === 'agent.step') scheduleReload();
        if (ev.notify) {
          const id = `${ev.id}`;
          setToasts((t) => [...t.slice(-2), { id, ev }]);
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
        }
      };
    };
    open();
    const poll = setInterval(reloadOffice, 30_000);
    return () => { es?.close(); clearTimeout(retry); clearInterval(poll); };
  }, [reloadOffice, scheduleReload]);

  const value = useMemo(() => ({
    office, events, toasts, connected, reloadOffice,
    subscribe: (fn) => { listeners.current.add(fn); return () => listeners.current.delete(fn); },
  }), [office, events, toasts, connected, reloadOffice]);
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}
export const useLive = () => useContext(LiveCtx);

export function useLiveReload(reload, match = () => true) {
  const live = useLive();
  useEffect(() => live?.subscribe((ev) => { if (match(ev)) reload(); }), [live, reload]);
}

// ---- Markdown mínimo y seguro (escapa HTML) ----
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
export function mdToHtml(src = '') {
  const lines = String(src).replace(/\r/g, '').split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*\|/.test(l) && /^\s*\|?\s*-{3}/.test(lines[i + 1] || '')) {
      const row = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = row(l);
      i += 2;
      const body = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(row(lines[i++]));
      html += `<div class="tbl"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)/))) { html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; continue; }
    if (/^\s*[-*]\s+/.test(l)) {
      html += '<ul>';
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*[-*]\s+/, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) item += `<br>${lines[i++].trim()}`;
        html += `<li>${inline(item).replace(/&lt;br&gt;/g, '<br>')}</li>`;
      }
      html += '</ul>';
      continue;
    }
    if (/^>\s?/.test(l)) { html += `<blockquote>${inline(l.replace(/^>\s?/, ''))}</blockquote>`; i++; continue; }
    if (!l.trim()) { i++; continue; }
    html += `<p>${inline(l)}</p>`;
    i++;
  }
  return html;
}
export function Markdown({ text }) {
  return <div className="md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />;
}

// ---- Toasts locales ----
const ToastCtx = createContext(() => {});
export function useToast() { return useContext(ToastCtx); }
export function ToastProvider({ children }) {
  const [items, set] = useState([]);
  const push = useCallback((text, kind = 'info') => {
    const id = Math.random();
    set((x) => [...x, { id, text, kind }]);
    setTimeout(() => set((x) => x.filter((i) => i.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" style={{ top: 'auto', bottom: 'calc(var(--nav-h) + 90px)' }}>
        {items.map((t) => <div key={t.id} className="toast" style={{ '--c': t.kind === 'error' ? 'var(--st-failed)' : t.kind === 'ok' ? 'var(--st-working)' : 'var(--accent)' }}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

export const go = (name, params) => { window.location.hash = `/${name}${params ? `?${new URLSearchParams(params)}` : ''}`; };
