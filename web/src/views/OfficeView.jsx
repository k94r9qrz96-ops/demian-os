import { SetupBanner } from './Setup.jsx';
import { useMemo, useState } from 'react';
import Office from '../Office.jsx';
import { useLive, Status, ago, usd } from '../lib.jsx';
import { Icon } from '../icons.jsx';
import { Avatar } from '../components/Avatar.jsx';

function TeamList({ office, filter, query, onPick }) {
  const deps = office.departments.filter((d) => !filter || d.key === filter);
  const match = (a) => !query || `${a.role} ${a.name} ${a.task?.title || ''}`.toLowerCase().includes(query.toLowerCase());
  const order = { working: 0, waiting_approval: 1, failed: 2, blocked: 3, queued: 4, completed: 5, available: 6 };
  return (
    <div className="listwrap">
      {deps.map((d) => {
        const agents = office.agents.filter((a) => a.department === d.key && match(a)).sort((x, y) => order[x.status] - order[y.status]);
        if (!agents.length) return null;
        return (
          <div key={d.key}>
            <div className="dept-head"><i style={{ background: d.color }} />{d.name}<span className="dim small" style={{ fontWeight: 400 }}>· {d.hint}</span></div>
            {agents.map((a) => (
              <div key={a.slug} className="agent-row" onClick={() => onPick(a.slug)}>
                <Avatar a={a} size={42} />
                <div className="min0">
                  <div className="row" style={{ gap: 8 }}><b style={{ fontWeight: 600 }}>{a.role}</b><span className="dim small">· {a.name}</span></div>
                  <div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.task ? `${a.task.title}${a.task.started_at ? ` · ${ago(a.task.started_at)}` : ''}` : a.mode === 'skill' ? 'Rutina del sistema · lista' : 'Sin tarea en curso'}
                  </div>
                </div>
                <Status s={a.status} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function OfficeView({ ctx }) {
  const { office, events } = useLive();
  const [filter, setFilter] = useState(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('officeMode') || 'oficina'; } catch { return 'oficina'; } });
  const setM = (m) => { setMode(m); try { localStorage.setItem('officeMode', m); } catch {} };
  const counts = useMemo(() => Object.fromEntries((office?.departments || []).map((d) => [d.key, office.agents.filter((a) => a.department === d.key).length])), [office]);
  if (!office) return <div className="page"><span className="spin" /></div>;
  const working = office.agents.filter((a) => a.status === 'working').length;
  const recent = events.filter((e) => e.type !== 'agent.step').slice(0, 8);
  return (
    <div className="office-screen">
      <SetupBanner />
      <div className="office-top">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="title">Oficina viva</div>
          <div className="small muted">{office.agents.length} agentes · {working ? `${working} trabajando ahora` : 'nadie ejecutando en este momento'} · gasto de hoy {usd(office.spend.day)} de US$ {office.spend.limits.dailyUsd}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input placeholder="Buscar agente…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 170, height: 38, padding: '8px 12px' }} className="desk-only" />
          <div className="seg">
            <button className={mode === 'oficina' ? 'on' : ''} onClick={() => setM('oficina')}><Icon name="office" size={16} />Oficina</button>
            <button className={mode === 'lista' ? 'on' : ''} onClick={() => setM('lista')}><Icon name="list" size={16} />Lista</button>
          </div>
        </div>
      </div>
      <div className="chips">
        <button className={`chip ${!filter ? 'on' : ''}`} onClick={() => setFilter(null)}>Toda la oficina <span className="n">{office.agents.length}</span></button>
        {office.departments.map((d) => (
          <button key={d.key} className={`chip ${filter === d.key ? 'on' : ''}`} onClick={() => setFilter(filter === d.key ? null : d.key)}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: d.color, display: 'inline-block' }} />{d.name.split(' · ')[0]} <span className="n">{counts[d.key]}</span>
          </button>
        ))}
      </div>
      {mode === 'lista' && <div className="mobile-only" style={{ padding: '0 14px 8px' }}><input placeholder="Buscar agente o tarea…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>}
      {recent.length > 0 && (
        <div className="live-strip desk-only">
          {recent.map((e) => <div key={e.id} className="ev" title={e.message} onClick={() => (e.task_id ? ctx.openTask(e.task_id) : e.agent_slug && ctx.openAgent(e.agent_slug))}><span className="dim">{ago(e.ts)}</span> · {e.message}</div>)}
        </div>
      )}
      <div className="office-stage" style={mode === 'lista' ? { border: 0, background: 'none' } : undefined}>
        {mode === 'oficina'
          ? <Office office={office} filter={filter} query={query} onPick={ctx.openAgent} />
          : <TeamList office={office} filter={filter} query={query} onPick={ctx.openAgent} />}
      </div>
    </div>
  );
}
