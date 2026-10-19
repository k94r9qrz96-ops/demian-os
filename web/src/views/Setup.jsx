import { useState } from 'react';
import { useApi, go } from '../lib.jsx';
import { Icon } from '../icons.jsx';

// Puesta en marcha: qué está listo, qué falta, para qué sirve cada paso y cómo hacerlo. Calculado del estado real.
export function SetupView() {
  const { data } = useApi('/readiness');
  const [open, setOpen] = useState(null);
  if (!data) return <div className="page"><span className="spin" /></div>;
  const next = data.steps.find((s) => !s.done && !s.optional) || data.steps.find((s) => !s.done);
  return (
    <div className="page">
      <div className="card col" style={{ gap: 6 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>{data.essential_done === data.essential_total ? 'Lo esencial está listo' : 'Todavía no está operativo del todo'}</b>
          <span className="small muted">{data.done}/{data.total} pasos</span>
        </div>
        <div className="progress"><div style={{ width: `${(data.done / data.total) * 100}%` }} /></div>
        {next && <div className="small muted" style={{ marginTop: 4 }}>Próximo paso: <b style={{ color: 'var(--text)' }}>{next.title}</b></div>}
      </div>

      <div className="sectionTitle">Pasos</div>
      <div className="col" style={{ gap: 10 }}>
        {data.steps.map((s, i) => (
          <div key={s.key} className="card" style={{ borderColor: s === next ? 'var(--accent)' : undefined }}>
            <div className="row" style={{ gap: 10, cursor: 'pointer' }} onClick={() => setOpen(open === s.key ? null : s.key)}>
              <span className="stepdot" style={{ background: s.done ? 'var(--st-working)' : 'transparent', borderColor: s.done ? 'var(--st-working)' : 'var(--dim)' }}>
                {s.done ? <Icon name="check" size={14} stroke={3} /> : i + 1}
              </span>
              <div className="min0 grow">
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div className="tiny dim">{s.done ? 'Listo' : s.optional ? 'Opcional · pendiente' : 'Pendiente'}</div>
              </div>
            </div>
            {(open === s.key || (open === null && s === next)) && (
              <div className="col small" style={{ gap: 8, marginTop: 10 }}>
                <div><b>Para qué sirve:</b> {s.what}</div>
                {!s.done && <div className="muted"><b>Mientras tanto:</b> {s.without}</div>}
                {!s.done && <div><b>Cómo:</b> {s.how}</div>}
                <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go(s.route)}>Ir</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sectionTitle">Lo que ya funciona hoy</div>
      <div className="card small col" style={{ gap: 6 }}>
        {data.works_now.map((w) => <div key={w} className="row" style={{ gap: 8, alignItems: 'flex-start' }}><Icon name="check" size={15} />{w}</div>)}
      </div>
    </div>
  );
}

// Franja compacta para la oficina: se ve solo mientras falte algo esencial.
export function SetupBanner() {
  const { data } = useApi('/readiness');
  if (!data || data.essential_done === data.essential_total) return null;
  const next = data.steps.find((s) => !s.done && !s.optional);
  return (
    <button className="setup-banner" onClick={() => go('puesta')}>
      <Icon name="target" size={16} />
      <span className="min0" style={{ textAlign: 'left' }}>Puesta en marcha {data.essential_done}/{data.essential_total} · falta: {next?.title}</span>
      <span className="tiny" style={{ marginLeft: 'auto' }}>Ver</span>
    </button>
  );
}
