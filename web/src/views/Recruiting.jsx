import { useCallback, useState } from 'react';
import { api, useApi, useLiveReload, fmtDate, useToast } from '../lib.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { Icon } from '../icons.jsx';

const STAGES = [['postulado', 'Postulado'], ['preseleccion', 'Preselección'], ['entrevista_agendada', 'Entrevista agendada'], ['entrevistado', 'Entrevistado'], ['videocv', 'VideoCV'], ['presentado', 'Presentado'], ['contratado', 'Contratado'], ['descartado', 'Descartado']];

function SearchSheet({ id, onClose, ctx }) {
  const { data: s, reload } = useApi(`/recruiting/searches/${id}`, [id]);
  const toast = useToast();
  const [cand, setCand] = useState({ full_name: '', phone: '', email: '', consent: false });
  if (!s) return <Sheet title="Cargando…" onClose={onClose}><span className="spin" /></Sheet>;
  const run = async (fn, okMsg) => { try { await fn(); toast(okMsg, 'ok'); reload(); } catch (e) { toast(e.message, 'error'); } };
  const addCand = () => run(() => api('/recruiting/candidates', { method: 'POST', body: { ...cand, search_id: s.id } }).then(() => setCand({ full_name: '', phone: '', email: '', consent: false })), 'Candidato agregado');
  return (
    <Sheet onClose={onClose} title={`${s.role_title} · ${s.hiring_company}`} subtitle={`Búsqueda #${s.id} · ${s.status} · permanencia ${s.guarantee_days ? `${s.guarantee_days} días` : 'pendiente'}`}
      actions={<button className="btn sm primary" onClick={() => ctx.openDirector({ text: 'Organizá las entrevistas de esta búsqueda y mostrame qué falta', company_id: ctx.me.companies.find((c) => c.slug === 'elite-hunters')?.id })}><Icon name="spark" size={15} />Pedir al director</button>}>
      <div className="note" style={{ marginBottom: 12 }}>Las decisiones sobre candidatos son tuyas. Los agentes sugieren; vos decidís y queda registrado.</div>
      <dl className="kv" style={{ marginBottom: 12 }}><dt>Condiciones</dt><dd>{s.commercial_terms || 'PENDIENTE de cargar'}</dd><dt>Ubicación</dt><dd>{s.location || '—'}</dd></dl>
      {s.applications.map((a) => (
        <div key={a.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="min0"><b>{a.full_name}</b><div className="small muted">{a.phone ? `+${a.phone}` : ''} {a.email || ''} {a.consent_at ? '· consentimiento ✓' : '· sin consentimiento'}</div></div>
            <select value={a.stage} onChange={(e) => run(() => api(`/recruiting/applications/${a.id}`, { method: 'PATCH', body: { stage: e.target.value } }), 'Etapa actualizada')} style={{ width: 'auto', padding: '6px 8px' }}>
              {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            {a.interviews.map((i) => <div key={i.id}>🗓 {i.scheduled_at ? fmtDate(i.scheduled_at) : 'sin fecha'} · {i.mode || 'modalidad ?'} · {i.status}{i.calendar_event_id ? ' · en Calendar' : ''}
              {i.status !== 'realizada' && <button className="btn sm ghost" onClick={() => run(() => api(`/recruiting/interviews/${i.id}`, { method: 'PATCH', body: { status: 'realizada' } }), 'Entrevista marcada como realizada')}>Marcar realizada</button>}</div>)}
          </div>
          <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
            <span className="small muted">Tu decisión:</span>
            {['avanzar', 'en_espera', 'descartar'].map((d) => (
              <button key={d} className={`btn sm ${a.human_decision === d ? (d === 'descartar' ? 'danger' : 'good') : ''}`} onClick={() => run(() => api(`/recruiting/applications/${a.id}/decision`, { method: 'POST', body: { decision: d } }), 'Decisión registrada')}>{d.replace('_', ' ')}</button>
            ))}
            {a.human_decision && <span className="tiny dim">por {a.decided_by_name} · {fmtDate(a.human_decision_at)}</span>}
          </div>
          {!a.interviews.length && <ScheduleInterview appId={a.id} onDone={reload} />}
          {a.stage === 'contratado' && <div className="small" style={{ marginTop: 8 }}>Permanencia hasta: <b>{a.guarantee_until || 'PENDIENTE (cargá fecha de ingreso)'}</b></div>}
        </div>
      ))}
      <div className="sectionTitle">Agregar candidato</div>
      <div className="col">
        <input placeholder="Nombre completo" value={cand.full_name} onChange={(e) => setCand({ ...cand, full_name: e.target.value })} />
        <div className="row"><input placeholder="Teléfono (con código de país)" value={cand.phone} onChange={(e) => setCand({ ...cand, phone: e.target.value })} /><input placeholder="Email" value={cand.email} onChange={(e) => setCand({ ...cand, email: e.target.value })} /></div>
        <label className="row small"><input type="checkbox" style={{ width: 'auto' }} checked={cand.consent} onChange={(e) => setCand({ ...cand, consent: e.target.checked })} />El candidato dio consentimiento para tratar sus datos y presentarlo</label>
        <button className="btn" disabled={!cand.full_name} onClick={addCand}>Agregar</button>
      </div>
    </Sheet>
  );
}

function ScheduleInterview({ appId, onDone }) {
  const [when, setWhen] = useState('');
  const [mode, setMode] = useState('presencial');
  const toast = useToast();
  const save = async () => {
    try { await api('/recruiting/interviews', { method: 'POST', body: { application_id: appId, scheduled_at: when ? new Date(when).toISOString() : null, mode, status: 'propuesta' } }); toast('Entrevista propuesta. Calendar se agenda con tu aprobación.', 'ok'); onDone(); }
    catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="row wrap" style={{ marginTop: 10 }}>
      <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ width: 'auto' }} />
      <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: 'auto' }}><option>presencial</option><option>videollamada</option><option>telefono</option></select>
      <button className="btn sm" onClick={save}>Proponer entrevista</button>
    </div>
  );
}

export function RecruitingView({ ctx }) {
  const { data, reload, error } = useApi('/recruiting/searches');
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.type.startsWith('recruiting.'));
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  const toast = useToast();
  if (error) return <div className="page"><div className="err">{error}</div></div>;
  const create = async () => { try { const s = await api('/recruiting/searches', { method: 'POST', body: form }); setForm(null); reload(); setOpen(s.id); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="muted small">Búsquedas a éxito, sin anticipos. Cada búsqueda guarda sus condiciones y su permanencia tal como se acordaron.</div>
        <button className="btn primary sm" onClick={() => setForm({ hiring_company: '', role_title: '', location: '', commercial_terms: '', guarantee_days: '' })}><Icon name="plus" size={16} />Nueva búsqueda</button>
      </div>
      {form && (
        <div className="card col" style={{ marginBottom: 14 }}>
          <div className="row"><input placeholder="Empresa contratante" value={form.hiring_company} onChange={(e) => setForm({ ...form, hiring_company: e.target.value })} /><input placeholder="Puesto" value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></div>
          <div className="row"><input placeholder="Ubicación" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><input type="number" placeholder="Permanencia (días)" value={form.guarantee_days} onChange={(e) => setForm({ ...form, guarantee_days: e.target.value })} /></div>
          <textarea placeholder="Condiciones comerciales acordadas (texto tal cual)" value={form.commercial_terms} onChange={(e) => setForm({ ...form, commercial_terms: e.target.value })} />
          <div className="row"><button className="btn primary" onClick={create} disabled={!form.hiring_company || !form.role_title}>Crear</button><button className="btn ghost" onClick={() => setForm(null)}>Cancelar</button></div>
        </div>
      )}
      {data?.length ? (
        <div className="grid2">
          {data.map((s) => (
            <div key={s.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpen(s.id)}>
              <div style={{ fontWeight: 650 }}>{s.role_title}</div>
              <div className="small muted">{s.hiring_company} · {s.status}{s.is_demo ? ' · demo' : ''}</div>
              <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>{Object.entries(s.stages).map(([k, n]) => <span key={k} className="chip" style={{ cursor: 'default', padding: '4px 9px' }}>{k.replace('_', ' ')} <span className="n">{n}</span></span>)}{!Object.keys(s.stages).length && <span className="small dim">Sin candidatos</span>}</div>
            </div>
          ))}
        </div>
      ) : <div className="empty"><b>Sin búsquedas cargadas</b>Creá la primera con sus condiciones reales.</div>}
      {open && <SearchSheet id={open} ctx={ctx} onClose={() => { setOpen(null); reload(); }} />}
    </div>
  );
}
