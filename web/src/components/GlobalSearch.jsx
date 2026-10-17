import { useEffect, useRef, useState } from 'react';
import { api, go } from '../lib.jsx';
import { Icon } from '../icons.jsx';
import { Sheet } from './Sheet.jsx';

function Results({ r, ctx, close }) {
  if (!r) return null;
  const empty = !Object.values(r).some((x) => x.length);
  if (empty) return <div className="small muted" style={{ padding: 12 }}>Sin resultados.</div>;
  const Sec = ({ title, items, render, onPick }) => items.length ? <><h5>{title}</h5>{items.map((x, i) => <div key={i} className="li" onClick={() => { onPick(x); close(); }}>{render(x)}</div>)}</> : null;
  return (
    <>
      <Sec title="Agentes" items={r.agents} render={(a) => <div className="min0"><div className="t">{a.role}</div><div className="s">{a.name}</div></div>} onPick={(a) => ctx.openAgent(a.slug)} />
      <Sec title="Tareas" items={r.tasks} render={(t) => <div className="min0"><div className="t">#{t.id} {t.title}</div><div className="s">{t.status}</div></div>} onPick={(t) => ctx.openTask(t.id)} />
      <Sec title="Clientes" items={r.clients} render={(c) => <div className="t">{c.name}</div>} onPick={(c) => go('memoria', { company: c.company_id, client: c.id })} />
      <Sec title="Contactos" items={r.contacts} render={(c) => <div className="min0"><div className="t">{c.name || 'Sin nombre'}</div><div className="s">{c.phone}</div></div>} onPick={() => go('conversaciones')} />
      <Sec title="Conversaciones" items={r.conversations} render={(c) => <div className="min0"><div className="t">{c.contact_name || `Conversación #${c.id}`}</div><div className="s">{c.content}</div></div>} onPick={(c) => go('conversaciones', { id: c.id })} />
      <Sec title="Entregables" items={r.deliverables} render={(d) => <div className="t">{d.title}</div>} onPick={(d) => ctx.openDeliverable(d.id)} />
    </>
  );
}

export function GlobalSearch({ ctx }) {
  const [q, setQ] = useState('');
  const [r, setR] = useState(null);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useRef();
  useEffect(() => {
    clearTimeout(t.current);
    if (q.trim().length < 2) { setR(null); return; }
    t.current = setTimeout(() => api(`/search?q=${encodeURIComponent(q)}`).then(setR).catch(() => {}), 220);
  }, [q]);
  const close = () => { setOpen(false); setMobileOpen(false); setQ(''); };
  return (
    <>
      <div className="searchbox desk">
        <Icon name="search" size={18} />
        <input placeholder="Buscar tareas, clientes, conversaciones…" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} />
        {open && r && <div className="search-pop"><Results r={r} ctx={ctx} close={close} /></div>}
      </div>
      <button className="iconbtn mobile-only" onClick={() => setMobileOpen(true)} aria-label="Buscar"><Icon name="search" size={19} /></button>
      {mobileOpen && (
        <Sheet kind="modal" title="Buscar" onClose={close}>
          <input autoFocus placeholder="Tareas, clientes, conversaciones…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ marginTop: 8 }}><Results r={r} ctx={ctx} close={close} /></div>
        </Sheet>
      )}
    </>
  );
}
