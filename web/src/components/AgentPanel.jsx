import { useCallback, useState } from 'react';
import { api, useApi, useLiveReload, Status, ago, usd, useToast } from '../lib.jsx';
import { Sheet } from './Sheet.jsx';
import { Avatar } from './Avatar.jsx';
import { Icon } from '../icons.jsx';

export function AgentPanel({ slug, ctx, onClose }) {
  const { data: a, reload, error } = useApi(`/agents/${slug}`, [slug]);
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.agent_slug === slug);
  const [tab, setTab] = useState('ahora');
  const [text, setText] = useState('');
  const [company, setCompany] = useState(ctx.me.companies[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (error) return <Sheet title="Agente" onClose={onClose}><div className="err">{error}</div></Sheet>;
  if (!a) return <Sheet title="Cargando…" onClose={onClose}><span className="spin" /></Sheet>;
  const assign = async () => {
    setBusy(true);
    try { const t = await api(`/agents/${slug}/task`, { method: 'POST', body: { text, company_id: company || null } }); setText(''); toast('Tarea creada y en cola', 'ok'); ctx.openTask(t.id); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet onClose={onClose} icon={<Avatar a={a} size={48} />} title={<span>{a.role}</span>} subtitle={<span>{a.name} · {a.department_name} · {a.mode === 'skill' ? 'rutina determinista' : a.mode === 'hybrid' ? 'rutina + Claude' : 'Claude con herramientas'}</span>}>
      <div className="row wrap" style={{ marginBottom: 12 }}><Status s={a.status} />{a.task && <span className="small muted">#{a.task.id} {a.task.title}</span>}</div>
      <div className="tabs">
        {[['ahora', 'Ahora'], ['historial', 'Historial'], ['resultados', 'Resultados'], ['errores', `Errores${a.errors.length ? ` (${a.errors.length})` : ''}`], ['config', 'Función y permisos']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'ahora' && (
        <div className="col">
          <div className="card">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Tarea actual</div>
            {a.task ? (
              <div className="li" style={{ border: 0, padding: 0 }} onClick={() => ctx.openTask(a.task.id)}>
                <div className="min0"><div className="t">{a.task.title}</div><div className="s">{a.task.status_reason || (a.task.started_at ? `Empezó ${ago(a.task.started_at)}` : 'En cola')}</div></div>
                <Icon name="back" size={16} style={{ transform: 'rotate(180deg)' }} />
              </div>
            ) : <div className="muted small">Sin ejecución en curso. Este agente no consume tokens en reposo.</div>}
          </div>
          <div className="card">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Darle una tarea directa</div>
            <textarea placeholder={`Ej.: ${a.department === 'diseno' ? 'Exportá un reel con las fotos del cliente' : 'Revisá… y preparame…'}`} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="row" style={{ marginTop: 8 }}>
              <select value={company} onChange={(e) => setCompany(e.target.value)} style={{ flex: 1 }}>
                <option value="">Sin empresa</option>
                {ctx.me.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="btn primary" disabled={!text.trim() || busy} onClick={assign}>{busy ? <span className="spin" /> : 'Asignar'}</button>
            </div>
            <div className="tiny dim" style={{ marginTop: 6 }}>Para pedidos que involucran varios roles, usá la instrucción al director.</div>
          </div>
          <div className="sectionTitle">Actividad reciente</div>
          <Feed items={a.history.slice(0, 8)} ctx={ctx} />
        </div>
      )}
      {tab === 'historial' && (
        <div className="list">
          {a.tasks.length ? a.tasks.map((t) => (
            <div key={t.id} className="li" onClick={() => ctx.openTask(t.id)}>
              <div className="min0"><div className="t">#{t.id} {t.title}</div><div className="s">{t.result_summary || t.status_reason || ago(t.created_at)}</div></div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}><Status s={t.status} /><span className="tiny dim">{usd(t.cost_usd)}</span></div>
            </div>
          )) : <div className="empty"><b>Sin historial</b>Todavía no ejecutó tareas.</div>}
          <div className="sectionTitle">Eventos</div>
          <Feed items={a.history} ctx={ctx} />
        </div>
      )}
      {tab === 'resultados' && (
        <div className="list">
          {a.deliverables.length ? a.deliverables.map((d) => (
            <div key={d.id} className="li" onClick={() => ctx.openDeliverable(d.id)}>
              <Icon name={d.kind === 'video' ? 'video' : 'doc'} /><div className="min0"><div className="t">{d.title}</div><div className="s">{ago(d.created_at)}</div></div>
            </div>
          )) : <div className="empty"><b>Sin entregables</b>Aparecen acá cuando el agente produce algo.</div>}
        </div>
      )}
      {tab === 'errores' && (
        <div className="col">
          {a.errors.length ? a.errors.map((e) => <div key={e.id} className="err" onClick={() => ctx.openTask(e.task_id)} style={{ cursor: 'pointer' }}><b>Tarea #{e.task_id}</b> · {ago(e.finished_at)}<br />{e.error}</div>) : <div className="okbox">Sin errores registrados.</div>}
        </div>
      )}
      {tab === 'config' && (
        <div className="col">
          <div className="card"><div className="sectionTitle" style={{ marginTop: 0 }}>Función</div><div className="small" style={{ whiteSpace: 'pre-wrap' }}>{a.instructions}</div></div>
          <div className="card">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Herramientas conectadas</div>
            {a.tools.length ? a.tools.map((t) => (
              <div key={t.key} className="row" style={{ padding: '6px 0', alignItems: 'flex-start' }}>
                <span className="int-status" style={{ marginTop: 6, background: !t.integration ? 'var(--st-working)' : t.integration.status === 'connected' ? 'var(--st-working)' : 'var(--st-waiting)' }} />
                <div className="min0 small"><b className="mono">{t.key}</b> — {t.description}{t.integration && t.integration.status !== 'connected' && <div className="tiny" style={{ color: '#ffd890' }}>Requiere {t.integration.key}: {t.integration.status}</div>}</div>
              </div>
            )) : <div className="small muted">Rutina interna sin herramientas externas.</div>}
          </div>
          <div className="card">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Acciones externas que puede proponer</div>
            {a.approvals_allowed.length ? a.approvals_allowed.map((x) => <div key={x} className="small">• {x} <span className="dim">(siempre con tu aprobación o una regla tuya)</span></div>) : <div className="small muted">Ninguna: no puede enviar ni publicar nada.</div>}
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function Feed({ items, ctx }) {
  const color = { error: 'var(--st-failed)', warning: 'var(--st-waiting)', success: 'var(--st-working)', info: 'var(--st-queued)' };
  if (!items?.length) return <div className="small muted">Sin actividad.</div>;
  return (
    <div>
      {items.map((e) => (
        <div key={e.id} className="feed-item" onClick={() => e.task_id && ctx?.openTask(e.task_id)} style={{ cursor: e.task_id ? 'pointer' : 'default' }}>
          <span className="lvl" style={{ background: color[e.level] }} />
          <div className="min0" style={{ flex: 1 }}>{e.message}</div>
          <span className="when">{ago(e.ts)}</span>
        </div>
      ))}
    </div>
  );
}
