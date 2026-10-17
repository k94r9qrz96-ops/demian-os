import { useCallback, useState } from 'react';
import { api, useApi, useLiveReload, Status, ago, fmtDate, usd, Markdown, useToast, useLive } from '../lib.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { Icon } from '../icons.jsx';
import { ApprovalCard } from './Approvals.jsx';

const COLS = [['queued', 'En cola'], ['running', 'Trabajando'], ['waiting_approval', 'Esperando aprobación'], ['blocked', 'Bloqueadas'], ['failed', 'Fallidas'], ['completed', 'Completadas']];

export function TasksView({ ctx }) {
  const [mode, setMode] = useState('lista');
  const [status, setStatus] = useState('');
  const [company, setCompany] = useState('');
  const qs = new URLSearchParams({ ...(status ? { status } : {}), ...(company ? { company_id: company } : {}), limit: 150 }).toString();
  const { data, reload } = useApi(`/tasks?${qs}`, [qs]);
  const { data: insts, reload: reloadI } = useApi('/instructions?limit=15');
  const rel = useCallback(() => { reload(); reloadI(); }, [reload, reloadI]);
  useLiveReload(rel, (ev) => ev.type.startsWith('task.') || ev.type.startsWith('instruction.'));
  const agents = Object.fromEntries((useLive().office?.agents || []).map((a) => [a.slug, a]));
  const tasks = data || [];
  return (
    <div className="page">
      <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="seg">
          <button className={mode === 'lista' ? 'on' : ''} onClick={() => setMode('lista')}><Icon name="list" size={16} />Lista</button>
          <button className={mode === 'tablero' ? 'on' : ''} onClick={() => setMode('tablero')}><Icon name="grid" size={16} />Tablero</button>
          <button className={mode === 'instrucciones' ? 'on' : ''} onClick={() => setMode('instrucciones')}><Icon name="spark" size={16} />Instrucciones</button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {mode === 'lista' && <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }}><option value="">Todos los estados</option>{COLS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
          <select value={company} onChange={(e) => setCompany(e.target.value)} style={{ width: 'auto' }}><option value="">Todas las empresas</option>{ctx.me.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
      </div>
      {mode === 'instrucciones' && (
        <div className="col">
          {(insts || []).length ? insts.map((i) => (
            <div key={i.id} className="card" style={{ cursor: 'pointer' }} onClick={() => ctx.openInstruction(i.id)}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="min0"><div style={{ fontWeight: 600 }}>“{i.text}”</div><div className="small muted">#{i.id} · {i.source === 'whatsapp' ? 'por WhatsApp' : 'desde la app'} · {ago(i.created_at)}</div></div>
                <Status s={i.status} />
              </div>
              {i.summary && <div className="small" style={{ marginTop: 8 }}>{i.summary}</div>}
              <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>{i.tasks.filter((t) => t.agent_slug !== 'director').map((t) => <Status key={t.id} s={t.status} />)}</div>
            </div>
          )) : <div className="empty"><b>Sin instrucciones todavía</b>Tocá “Instrucción al director” para empezar.</div>}
        </div>
      )}
      {mode === 'lista' && (
        tasks.length ? <div className="card" style={{ padding: '4px 14px' }}><div className="list">
          {tasks.map((t) => (
            <div key={t.id} className="li" onClick={() => ctx.openTask(t.id)}>
              <div className="min0">
                <div className="t">{t.title}{t.is_demo ? <span className="tiny dim"> · demo</span> : null}</div>
                <div className="s">#{t.id} · {agents[t.agent_slug]?.role || t.agent_slug} · {t.status_reason || t.result_summary || ago(t.created_at)}</div>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}><Status s={t.status} /><span className="tiny dim">{usd(t.cost_usd)}</span></div>
            </div>
          ))}
        </div></div> : <div className="empty"><b>Sin tareas</b>Las tareas aparecen cuando le das una instrucción al director o a un agente.</div>
      )}
      {mode === 'tablero' && (
        <div className="board">
          {COLS.map(([k, l]) => {
            const items = tasks.filter((t) => t.status === k);
            return (
              <div key={k} className="colm">
                <h4><Status s={k} /><span className="dim">{items.length}</span></h4>
                {items.slice(0, 40).map((t) => (
                  <div key={t.id} className="tcard" onClick={() => ctx.openTask(t.id)}>
                    <div style={{ fontWeight: 560 }}>{t.title}</div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>{agents[t.agent_slug]?.role || t.agent_slug} · {ago(t.created_at)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TaskSheet({ id, ctx, onClose }) {
  const { data: t, reload, error } = useApi(`/tasks/${id}`, [id]);
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.task_id === id);
  const toast = useToast();
  if (error) return <Sheet title="Tarea" onClose={onClose}><div className="err">{error}</div></Sheet>;
  if (!t) return <Sheet title="Cargando…" onClose={onClose}><span className="spin" /></Sheet>;
  const act = async (what) => { try { await api(`/tasks/${id}/${what}`, { method: 'POST' }); toast(what === 'retry' ? 'Reintento en cola' : 'Tarea cancelada', 'ok'); reload(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <Sheet onClose={onClose} title={t.title} subtitle={`#${t.id} · ${t.agent?.role || t.agent_slug}${t.company ? ` · ${t.company.name}` : ''}${t.client ? ` · ${t.client.name}` : ''}`}>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <Status s={t.status} />
        {['queued', 'running', 'waiting_approval'].includes(t.status) && <button className="btn sm danger" onClick={() => act('cancel')}>Cancelar</button>}
        {['failed', 'blocked', 'cancelled'].includes(t.status) && <button className="btn sm" onClick={() => act('retry')}><Icon name="refresh" size={15} />Reintentar</button>}
        <button className="btn sm ghost" onClick={() => ctx.openAgent(t.agent_slug)}>Ver agente</button>
      </div>
      {t.status_reason && <div className={t.status === 'failed' ? 'err' : 'note'} style={{ marginBottom: 12 }}>{t.status_reason}</div>}
      {t.result_summary && <div className="card"><div className="sectionTitle" style={{ marginTop: 0 }}>Resultado</div><div style={{ whiteSpace: 'pre-wrap' }}>{t.result_summary}</div></div>}
      {t.approvals.length > 0 && <><div className="sectionTitle">Acciones que requieren tu intervención</div>{t.approvals.map((a) => <ApprovalCard key={a.id} a={a} onDone={reload} />)}</>}
      {t.deliverables.length > 0 && (
        <><div className="sectionTitle">Entregables</div>
          {t.deliverables.map((d) => (
            <div key={d.id} className="card" style={{ cursor: 'pointer' }} onClick={() => ctx.openDeliverable(d.id)}>
              <div className="row"><Icon name={d.kind === 'video' ? 'video' : 'doc'} /><b>{d.title}</b></div>
              {d.kind === 'markdown' && <div className="small muted" style={{ marginTop: 6, maxHeight: 64, overflow: 'hidden' }}>{d.body?.slice(0, 220)}</div>}
              {d.kind === 'video' && <div className="small muted" style={{ marginTop: 6 }}>{d.meta.width}×{d.meta.height} · {Number(d.meta.expected_seconds).toFixed(1)} s · {(d.size / 1e6).toFixed(1)} MB {d.meta.qa ? `· QA ${d.meta.qa.ok ? '✅' : '❌'}` : ''}</div>}
            </div>
          ))}</>
      )}
      <div className="sectionTitle">Detalle</div>
      <dl className="kv">
        <dt>Responsable</dt><dd>{t.agent?.role} ({t.agent?.name})</dd>
        <dt>Creada</dt><dd>{fmtDate(t.created_at)}</dd>
        <dt>Inicio</dt><dd>{fmtDate(t.started_at)}</dd>
        <dt>Fin</dt><dd>{fmtDate(t.finished_at)}</dd>
        <dt>Costo</dt><dd>{usd(t.cost_usd)} registrado{t.cost_estimate_usd ? ` · ${usd(t.cost_estimate_usd)} estimado` : ''}</dd>
        <dt>Intentos</dt><dd>{t.attempts}</dd>
        {t.dependencies.length > 0 && <><dt>Depende de</dt><dd>{t.dependencies.map((d) => <div key={d.id} style={{ cursor: 'pointer' }} onClick={() => ctx.openTask(d.id)}>#{d.id} {d.title} · {d.status}</div>)}</dd></>}
        {t.sources.length > 0 && <><dt>Fuentes</dt><dd>{t.sources.map((s, i) => <div key={i}>{s.type === 'web' ? <a href={s.ref} target="_blank" rel="noopener noreferrer">{s.title || s.ref}</a> : `${s.type}: ${s.title}`} <span className="dim tiny">{s.date}</span></div>)}</dd></>}
      </dl>
      <div className="sectionTitle">Instrucción</div>
      <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{t.input}</div>
      <div className="sectionTitle">Evidencia de ejecución</div>
      {t.runs.length ? t.runs.map((r) => (
        <div key={r.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}><b className="small">Intento {r.attempt}</b><Status s={r.status === 'running' ? 'running' : r.status} /></div>
          <div className="tiny dim" style={{ margin: '4px 0 8px' }}>{fmtDate(r.started_at)} → {fmtDate(r.finished_at)}{r.model ? ` · ${r.model} · ${r.tokens_in}+${r.tokens_out} tokens` : ''}{r.web_searches ? ` · ${r.web_searches} búsquedas` : ''} · {usd(r.cost_usd)}</div>
          {r.steps.map((s, i) => <div key={i} className="step"><span className="k">{s.type}</span><span className="min0">{s.summary}</span></div>)}
          {r.error && <div className="err" style={{ marginTop: 8 }}>{r.error}</div>}
        </div>
      )) : <div className="small muted">Todavía no se ejecutó.</div>}
    </Sheet>
  );
}
