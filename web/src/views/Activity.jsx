import { useEffect, useState } from 'react';
import { api, useLive } from '../lib.jsx';
import { Feed } from '../components/AgentPanel.jsx';

export function ActivityView({ ctx }) {
  const live = useLive();
  const [onlyNotify, setOnly] = useState(true);
  useEffect(() => { api('/notifications/read', { method: 'POST' }).then(() => live.reloadOffice()).catch(() => {}); }, []);
  const items = live.events.filter((e) => (onlyNotify ? e.notify : e.type !== 'agent.step'));
  return (
    <div className="page">
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={onlyNotify ? 'on' : ''} onClick={() => setOnly(true)}>Notificaciones</button>
        <button className={!onlyNotify ? 'on' : ''} onClick={() => setOnly(false)}>Toda la actividad</button>
      </div>
      <div className="card">{items.length ? <Feed items={items} ctx={ctx} /> : <div className="small muted">Sin novedades.</div>}</div>
    </div>
  );
}
