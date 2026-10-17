import { useCallback, useState } from 'react';
import { api, useApi, useLiveReload, Status, ago, fmtDate, useToast } from '../lib.jsx';

export function ApprovalCard({ a, onDone }) {
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState('');
  const toast = useToast();
  const p = a.payload || {};
  const decide = async (decision) => {
    setBusy(decision);
    try {
      await api(`/approvals/${a.id}/decide`, { method: 'POST', body: { decision, note: note || null, payload_hash: a.payload_hash } });
      toast(decision === 'approve' ? 'Aprobado. Se ejecuta y se confirma con el servicio.' : 'Rechazado', 'ok');
      onDone?.();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  const content = a.action === 'chatwoot_message' ? p.content : a.action === 'gmail_send' ? `Asunto: ${p.subject}\n\n${p.body_text}` : a.action === 'calendar_event' ? `${p.summary}\n${fmtDate(p.start)} → ${fmtDate(p.end)}${p.attendees?.length ? `\nInvitados: ${p.attendees.join(', ')}` : ''}` : JSON.stringify(p, null, 2);
  return (
    <div className="card approval">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="min0">
          <div style={{ fontWeight: 650 }}>{a.action_label || a.action}</div>
          <div className="small muted">Código <b className="mono">{a.code}</b> · {ago(a.created_at)}{a.company_name ? ` · ${a.company_name}` : ''}{a.client_name ? ` · ${a.client_name}` : ''}</div>
        </div>
        <Status s={a.status} />
      </div>
      <dl className="kv" style={{ margin: '12px 0' }}>
        <dt>Destinatario</dt><dd><b>{a.recipient}</b></dd>
        <dt>Cuenta</dt><dd>{a.account}</dd>
        <dt>Motivo</dt><dd>{a.summary}</dd>
      </dl>
      <div className="payload">{content}</div>
      {a.status === 'pending' && (
        <>
          <input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 10 }} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn good" style={{ flex: 1 }} disabled={!!busy} onClick={() => decide('approve')}>{busy === 'approve' ? <span className="spin" /> : 'Aprobar y ejecutar'}</button>
            <button className="btn danger" disabled={!!busy} onClick={() => decide('reject')}>Rechazar</button>
          </div>
          <div className="tiny dim" style={{ marginTop: 8 }}>Por WhatsApp verificado: respondé “APROBAR {a.code}”. Se registra exactamente este contenido (huella {a.payload_hash.slice(0, 10)}…).</div>
        </>
      )}
      {a.status !== 'pending' && (
        <div className="small" style={{ marginTop: 10 }}>
          {a.decided_at && <div className="muted">Decidido {fmtDate(a.decided_at)} vía {a.decided_via}{a.decision_note ? ` · “${a.decision_note}”` : ''}</div>}
          {a.external?.status === 'confirmed' && <div className="okbox" style={{ marginTop: 8 }}>Confirmado por el servicio · id externo <span className="mono">{a.external.external_id}</span>{a.external.delivery_status ? ` · entrega: ${a.external.delivery_status}` : ''}</div>}
          {a.error && <div className="err" style={{ marginTop: 8 }}>{a.error}</div>}
        </div>
      )}
    </div>
  );
}

export function ApprovalsView() {
  const [status, setStatus] = useState('pending');
  const { data, reload } = useApi(`/approvals?status=${status}`, [status]);
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.type.startsWith('approval.'));
  return (
    <div className="page">
      <div className="seg" style={{ marginBottom: 14 }}>
        {[['pending', 'Pendientes'], ['executed', 'Ejecutadas'], ['failed', 'Fallidas'], ['rejected', 'Rechazadas'], ['all', 'Todas']].map(([k, l]) => <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}</button>)}
      </div>
      {data?.length ? data.map((a) => <ApprovalCard key={a.id} a={a} onDone={reload} />) : <div className="empty"><b>{status === 'pending' ? 'Nada para aprobar' : 'Sin registros'}</b>Cuando un agente proponga un envío, una publicación o un evento, aparece acá con el contenido exacto.</div>}
    </div>
  );
}
