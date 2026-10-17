import { useState } from 'react';
import { api, useApi, Status, ago, useToast } from '../lib.jsx';
import { Icon } from '../icons.jsx';

const GROUPS = [['claude', 'Claude', ['claude']], ['chatwoot', 'Chatwoot + WhatsApp', ['chatwoot', 'whatsapp']], ['google', 'Google', ['google_gmail', 'google_calendar', 'google_drive']], ['metricool', 'Metricool', ['metricool']]];

function SecretRow({ s, onSaved }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const save = async (value) => {
    setBusy(true);
    try { const r = await api(`/secrets/${s.key}`, { method: 'PUT', body: { value } }); setV(''); toast(value ? 'Guardado (cifrado en el servidor)' : 'Eliminado', 'ok'); onSaved(r); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <b className="small">{s.label}</b>
        <span className="tiny" style={{ color: s.source ? 'var(--st-working)' : 'var(--dim)' }}>{s.source ? `${s.preview} · ${s.source === 'servidor' ? 'en el servidor' : 'cargada'}` : 'sin cargar'}</span>
      </div>
      <div className="tiny dim" style={{ margin: '3px 0 6px' }}>{s.help}</div>
      {s.source !== 'servidor' && (
        <div className="row" style={{ gap: 6 }}>
          <input type={s.secret ? 'password' : 'text'} autoComplete="off" placeholder={s.source ? 'Reemplazar…' : 'Pegar valor'} value={v} onChange={(e) => setV(e.target.value)} style={{ padding: '8px 10px' }} />
          <button className="btn sm primary" disabled={!v.trim() || busy} onClick={() => save(v)}>Guardar</button>
          {s.generate && <button className="btn sm" disabled={busy} onClick={() => save('__generate__')}>Generar</button>}
          {s.source && <button className="btn sm ghost" disabled={busy} onClick={() => confirm('¿Eliminar esta credencial?') && save('')}>Quitar</button>}
        </div>
      )}
    </div>
  );
}

function Credentials({ onChanged }) {
  const { data, reload } = useApi('/secrets');
  const [open, setOpen] = useState('claude');
  const toast = useToast();
  if (!data) return null;
  const copy = (t) => { navigator.clipboard?.writeText(t); toast('Copiado', 'ok'); };
  return (
    <>
      <div className="sectionTitle" style={{ marginTop: 0 }}>Credenciales</div>
      <div className="card">
        <div className="small muted" style={{ marginBottom: 8 }}>Se guardan cifradas en tu servidor y nunca vuelven a mostrarse completas. Solo vos (dueño) las ves.</div>
        <div className="seg" style={{ flexWrap: 'wrap' }}>{GROUPS.map(([k, l]) => <button key={k} className={open === k ? 'on' : ''} onClick={() => setOpen(k)}>{l}</button>)}</div>
        {open === 'chatwoot' && <div className="note" style={{ marginTop: 10 }}>URL del webhook para Chatwoot: <span className="mono" style={{ overflowWrap: 'anywhere' }}>{data.webhook_url}</span> <button className="btn sm" onClick={() => copy(data.webhook_url)}>Copiar</button></div>}
        {open === 'google' && <div className="note" style={{ marginTop: 10 }}>URI de redirección autorizada (pegala en Google Cloud): <span className="mono" style={{ overflowWrap: 'anywhere' }}>{data.google_redirect}</span> <button className="btn sm" onClick={() => copy(data.google_redirect)}>Copiar</button></div>}
        {data.items.filter((s) => s.group === open).map((s) => <SecretRow key={s.key} s={s} onSaved={() => { reload(); onChanged(GROUPS.find((g) => g[0] === open)[2]); }} />)}
      </div>
    </>
  );
}

export function IntegrationsView({ ctx }) {
  const { data, reload } = useApi('/integrations');
  const [busy, setBusy] = useState(null);
  const [results, setResults] = useState({});
  const toast = useToast();
  const test = async (key) => {
    setBusy(key);
    try { const r = await api(`/integrations/${key}/test`, { method: 'POST' }); setResults((x) => ({ ...x, [key]: r })); reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  return (
    <div className="page">
      {ctx.params.google === 'ok' && <div className="okbox" style={{ marginBottom: 12 }}>Google autorizado.</div>}
      {ctx.params.google === 'error' && <div className="err" style={{ marginBottom: 12 }}>La autorización de Google falló. Revisá la actividad para ver el motivo.</div>}
      {ctx.me.user.role === 'owner' && <Credentials onChanged={(keys) => keys.forEach((k) => test(k))} />}
      <div className="sectionTitle">Estado</div>
      <div className="muted small" style={{ marginBottom: 14 }}>Cada integración muestra su estado real. “Probar” hace una llamada mínima al servicio. Las claves se cargan como secretos del servidor (nunca acá).</div>
      <div className="grid2">
        {(data || []).map((i) => {
          const r = results[i.key];
          const st = r?.status || i.status;
          return (
            <div key={i.key} className="card col" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}><b>{i.name}</b><Status s={st} /></div>
              <div className="small muted">{i.purpose}</div>
              <div className={st === 'connected' ? 'okbox' : st === 'error' ? 'err' : 'note'} style={{ fontSize: 13 }}>{r?.detail || i.detail}{i.last_checked_at && <div className="tiny dim">Probado {ago(r?.last_checked_at || i.last_checked_at)}</div>}</div>
              {st !== 'connected' && <div className="tiny muted">{i.help}</div>}
              <div className="row">
                <button className="btn sm" onClick={() => test(i.key)} disabled={busy === i.key}>{busy === i.key ? <span className="spin" /> : <><Icon name="refresh" size={15} />Probar</>}</button>
                {i.key.startsWith('google_') && st !== 'connected' && <a className="btn sm primary" href="/api/integrations/google/connect">Autorizar Google</a>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sectionTitle">n8n</div>
      <div className="card small muted">No se usa: la cola, los reintentos, la deduplicación y la programación viven dentro de Demian OS, así que n8n sumaría otro servicio que mantener sin aportar al circuito actual. Si más adelante querés flujos visuales, se puede conectar consumiendo la API.</div>
    </div>
  );
}
