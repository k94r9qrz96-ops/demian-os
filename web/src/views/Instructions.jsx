import { useCallback } from 'react';
import { useApi, useLiveReload, Status, ago, Markdown, useLive } from '../lib.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { Icon } from '../icons.jsx';
import { ApprovalCard } from './Approvals.jsx';

export function InstructionSheet({ id, ctx, onClose }) {
  const { data: i, reload } = useApi(`/instructions/${id}`, [id]);
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.instruction_id === id || ev.type.startsWith('approval.'));
  const agents = Object.fromEntries((useLive().office?.agents || []).map((a) => [a.slug, a]));
  if (!i) return <Sheet title="Cargando…" onClose={onClose}><span className="spin" /></Sheet>;
  const summary = i.deliverables.find((d) => d.title === 'Resumen del director');
  const pending = i.approvals.filter((a) => a.status === 'pending');
  const tasks = i.tasks.filter((t) => t.kind !== 'consolidate');
  return (
    <Sheet onClose={onClose} title={`“${i.text}”`} subtitle={`Instrucción #${i.id} · ${i.source === 'whatsapp' ? 'por WhatsApp' : 'desde la app'} · ${ago(i.created_at)}`}>
      <div className="row wrap" style={{ marginBottom: 12 }}><Status s={i.status} />{i.summary && <span className="small muted">{i.summary}</span>}</div>
      {i.plan?.missing?.length > 0 && <div className="note" style={{ marginBottom: 12 }}><b>Falta:</b> {i.plan.missing.join(' · ')}</div>}
      {pending.length > 0 && <><div className="sectionTitle" style={{ marginTop: 0 }}>Requiere tu aprobación ({pending.length})</div>{pending.map((a) => <ApprovalCard key={a.id} a={a} onDone={reload} />)}</>}
      <div className="sectionTitle">Plan y avance</div>
      <div className="card" style={{ padding: '4px 14px' }}>
        <div className="list">
          {tasks.map((t) => (
            <div key={t.id} className="li" onClick={() => ctx.openTask(t.id)}>
              <div className="min0"><div className="t">{t.title}</div><div className="s">{agents[t.agent_slug]?.role || t.agent_slug}{t.depends_on.length ? ` · después de #${t.depends_on.join(', #')}` : ''}{t.status_reason ? ` · ${t.status_reason}` : ''}</div></div>
              <Status s={t.status} />
            </div>
          ))}
        </div>
      </div>
      {i.deliverables.filter((d) => d !== summary).length > 0 && (
        <><div className="sectionTitle">Entregables</div>
          <div className="list">{i.deliverables.filter((d) => d !== summary).map((d) => (
            <div key={d.id} className="li" onClick={() => ctx.openDeliverable(d.id)}><Icon name={d.kind === 'video' ? 'video' : 'doc'} /><div className="min0"><div className="t">{d.title}</div><div className="s">{ago(d.created_at)}</div></div></div>
          ))}</div></>
      )}
      {summary && <><div className="sectionTitle">Resumen del director</div><div className="card"><Markdown text={summary.body} /></div></>}
    </Sheet>
  );
}
