import { useState } from 'react';
import { api, useApi, usd, useToast, useLive } from '../lib.jsx';
import { Icon } from '../icons.jsx';

const MODES = { draft: 'Borrador (nota privada + aprobación)', auto: 'Responder automáticamente', off: 'No responder (solo registrar)' };
const ACTIONS = [['chatwoot_message', 'Mensajes de WhatsApp'], ['gmail_send', 'Emails'], ['calendar_event', 'Eventos de Calendar'], ['metricool_schedule', 'Publicaciones']];

export function SettingsView({ ctx }) {
  const { data: s, reload } = useApi('/settings');
  const live = useLive();
  const toast = useToast();
  const [phone, setPhone] = useState(ctx.me.user.whatsapp_phone || '');
  const [code, setCode] = useState(null);
  const owner = ctx.me.user.role === 'owner';
  if (!s) return <div className="page"><span className="spin" /></div>;
  const run = async (fn, msg) => { try { await fn(); toast(msg, 'ok'); reload(); live.reloadOffice(); } catch (e) { toast(e.message, 'error'); } };
  const max = Math.max(0.0001, ...s.spend_by_day.map((d) => d.usd));
  return (
    <div className="page">
      <div className="card">
        <div className="toggle">
          <div><b>Pausa general de automatizaciones</b><div className="small muted">Detiene tareas automáticas y respuestas a clientes. Tu canal de dirección sigue funcionando para reanudar.</div></div>
          <div className={`switch ${s.paused ? 'on' : ''}`} role="switch" aria-checked={s.paused} tabIndex={0} onClick={() => run(() => api('/settings/pause', { method: 'POST', body: { paused: !s.paused } }), s.paused ? 'Automatizaciones reanudadas' : 'Automatizaciones pausadas')} />
        </div>
      </div>

      <div className="sectionTitle">Gasto</div>
      <div className="stats">
        <div className="stat"><b>{usd(s.spend.day)}</b><span>hoy · límite US$ {s.limits.dailyUsd}</span></div>
        <div className="stat"><b>{usd(s.spend.month)}</b><span>este mes · límite US$ {s.limits.monthlyUsd}</span></div>
        <div className="stat"><b>US$ {s.limits.taskUsd}</b><span>máximo por tarea</span></div>
      </div>
      {s.spend_by_day.length > 0 && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="small muted" style={{ marginBottom: 8 }}>Últimos 30 días</div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 3, height: 80 }}>
            {s.spend_by_day.map((d) => <div key={d.day} title={`${d.day}: ${usd(d.usd)}`} style={{ flex: 1, height: `${Math.max(3, (d.usd / max) * 100)}%`, background: 'var(--accent)', borderRadius: 3, opacity: 0.85 }} />)}
          </div>
        </div>
      )}
      {owner && <LimitsForm limits={s.limits} onSave={(l) => run(() => api('/settings/limits', { method: 'PUT', body: l }), 'Límites guardados')} />}

      <div className="sectionTitle">Autonomía</div>
      <div className="card col">
        <div className="small muted">Por defecto todo envío, publicación o evento requiere tu aprobación. Acá podés autorizar reglas: lo que pongas en “automático” no vuelve a preguntarte.</div>
        <label className="f">Respuestas a clientes y candidatos por WhatsApp (todas las empresas)
          <select disabled={!owner} value={s.autonomy.external_reply.default} onChange={(e) => run(() => api('/settings/autonomy', { method: 'PUT', body: { external_reply: { default: e.target.value } } }), 'Regla guardada')}>
            {Object.entries(MODES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        {ctx.me.companies.map((c) => (
          <label key={c.id} className="f">{c.name}: respuestas por WhatsApp
            <select disabled={!owner} value={s.autonomy.external_reply[c.slug] || ''} onChange={(e) => run(() => api('/settings/autonomy', { method: 'PUT', body: { external_reply: { [c.slug]: e.target.value || s.autonomy.external_reply.default } } }), 'Regla guardada')}>
              <option value="">Igual que la regla general</option>
              {Object.entries(MODES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        ))}
        <div className="hr" />
        {ACTIONS.map(([k, l]) => (
          <label key={k} className="f">{l} propuestos por agentes
            <select disabled={!owner} value={s.autonomy.actions[k] || 'approval'} onChange={(e) => run(() => api('/settings/autonomy', { method: 'PUT', body: { actions: { [k]: e.target.value } } }), 'Regla guardada')}>
              <option value="approval">Pedirme aprobación cada vez</option>
              <option value="auto">Ejecutar automáticamente</option>
            </select>
          </label>
        ))}
      </div>

      <div className="sectionTitle">Tu canal de dirección por WhatsApp</div>
      <div className="card col">
        <div className="small muted">Solo teléfonos verificados pueden dar órdenes, aprobar (“APROBAR CÓDIGO”), pausar (“pausar todo”) o pedir “estado”. Cualquier otro número se trata como cliente.</div>
        <div className="row"><input placeholder="Tu número con código de país (ej. 5491122334455)" value={phone} onChange={(e) => setPhone(e.target.value)} /><button className="btn" onClick={() => run(async () => setCode(await api('/me/whatsapp', { method: 'POST', body: { phone } })), 'Código generado')}>Verificar</button></div>
        {ctx.me.user.whatsapp_verified && !code && <div className="okbox">Verificado: +{ctx.me.user.whatsapp_phone}</div>}
        {code && <div className="note">Desde <b>+{code.phone}</b> enviá al número conectado a Chatwoot: <b className="mono">VERIFICAR {code.code}</b></div>}
      </div>

      <div className="sectionTitle">Webhook de Chatwoot</div>
      <div className="card small">
        <div className="mono" style={{ overflowWrap: 'anywhere' }}>{s.webhook_url || 'Solo visible para el dueño'}</div>
        <div className="muted" style={{ marginTop: 6 }}>Pegala en el Agent Bot (Chatwoot → Ajustes → Bots) y en un webhook de cuenta con eventos de mensajes y conversaciones. Los tokens se cargan en Integraciones → Credenciales.</div>
      </div>

      <div className="sectionTitle">Tu contraseña</div>
      <PasswordForm />
    </div>
  );
}

function LimitsForm({ limits, onSave }) {
  const [l, setL] = useState(limits);
  return (
    <div className="card row wrap" style={{ marginTop: 10, alignItems: 'flex-end' }}>
      {[['taskUsd', 'Por tarea (US$)'], ['dailyUsd', 'Diario (US$)'], ['monthlyUsd', 'Mensual (US$)'], ['alertRatio', 'Alerta al (0–1)']].map(([k, label]) => (
        <label key={k} className="f" style={{ flex: 1, minWidth: 120 }}>{label}<input type="number" step="0.1" value={l[k]} onChange={(e) => setL({ ...l, [k]: e.target.value })} /></label>
      ))}
      <button className="btn" onClick={() => onSave(l)}><Icon name="check" size={16} />Guardar</button>
    </div>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const toast = useToast();
  const save = async () => {
    try { await api('/me/password', { method: 'POST', body: { current: cur, next } }); setCur(''); setNext(''); toast('Contraseña cambiada. Se cerraron las otras sesiones.', 'ok'); }
    catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="card row wrap" style={{ alignItems: 'flex-end' }}>
      <label className="f" style={{ flex: 1, minWidth: 160 }}>Actual<input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></label>
      <label className="f" style={{ flex: 1, minWidth: 160 }}>Nueva (mín. 10)<input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></label>
      <button className="btn" disabled={!cur || next.length < 10} onClick={save}>Cambiar</button>
    </div>
  );
}
