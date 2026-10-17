import { useCallback, useState } from 'react';
import { api, useApi, useLiveReload, ago, useToast, Status } from '../lib.jsx';
import { Sheet } from '../components/Sheet.jsx';

function ConversationSheet({ id, onClose }) {
  const { data: c, reload } = useApi(`/conversations/${id}`, [id]);
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.data && String(ev.data).includes(`"conversation_id":${id}`) || ev.type.startsWith('conversation.'));
  const toast = useToast();
  if (!c) return <Sheet title="Cargando…" onClose={onClose}><span className="spin" /></Sheet>;
  const toggle = async () => { try { await api(`/conversations/${id}/${c.bot_paused ? 'resume' : 'pause'}`, { method: 'POST' }); reload(); } catch (e) { toast(e.message, 'error'); } };
  const windowOpen = c.last_inbound_at && Date.parse(c.last_inbound_at) > Date.now() - 86400000;
  return (
    <Sheet onClose={onClose} title={`Conversación #${c.id}`} subtitle={`${c.mode === 'director' ? 'Canal de dirección (verificado)' : 'Atención externa'} · Chatwoot ${c.external_id}`}>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <span className="status" style={{ '--c': c.bot_paused ? 'var(--st-blocked)' : 'var(--st-working)' }}><i />{c.bot_paused ? 'Bot pausado' : 'Bot activo'}</span>
        <span className="status" style={{ '--c': windowOpen ? 'var(--st-working)' : 'var(--st-available)' }}><i />{windowOpen ? 'Ventana 24 h abierta' : 'Ventana cerrada: solo plantillas'}</span>
        {c.mode === 'external' && <button className="btn sm" onClick={toggle}>{c.bot_paused ? 'Reactivar bot' : 'Tomar conversación (pausar bot)'}</button>}
      </div>
      {c.paused_reason && <div className="note" style={{ marginBottom: 10 }}>{c.paused_reason}</div>}
      <div className="col" style={{ gap: 8 }}>
        {c.messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.direction === 'in' ? 'flex-start' : 'flex-end', maxWidth: '85%', background: m.private ? 'rgba(242,181,68,.1)' : m.direction === 'in' ? 'var(--panel2)' : '#1d3a31', border: '1px solid var(--line)', borderRadius: 12, padding: '8px 11px' }}>
            {m.private ? <div className="tiny" style={{ color: '#ffd890' }}>Nota privada</div> : null}
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.content || (m.attachments.length ? `[${m.attachments.map((a) => a.type).join(', ')}]` : '')}</div>
            <div className="tiny dim" style={{ marginTop: 3 }}>{m.origin === 'demian_os' ? 'Demian OS' : m.origin === 'human' ? 'Persona' : 'Contacto'} · {ago(m.created_at)}{m.delivery_status ? ` · ${m.delivery_status}` : ''}</div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function ConversationsView({ ctx }) {
  const { data, reload } = useApi('/conversations');
  const rel = useCallback(() => reload(), [reload]);
  useLiveReload(rel, (ev) => ev.type.startsWith('conversation.') || ev.type === 'crm.contact');
  const [open, setOpen] = useState(ctx.params.id ? Number(ctx.params.id) : null);
  return (
    <div className="page">
      <div className="note" style={{ marginBottom: 14 }}>Circuito: WhatsApp → API oficial de Meta → Chatwoot → Demian OS → Chatwoot → WhatsApp. Respondés vos desde Chatwoot cuando quieras: el bot se pausa solo en esa conversación.</div>
      {data?.length ? (
        <div className="card" style={{ padding: '4px 14px' }}><div className="list">
          {data.map((c) => (
            <div key={c.id} className="li" onClick={() => setOpen(c.id)}>
              <div className="min0">
                <div className="t">{c.mode === 'director' ? '📣 Canal de dirección' : c.contact_name || (c.contact_phone ? `+${c.contact_phone}` : `Conversación ${c.external_id}`)}</div>
                <div className="s">{c.company_name || 'Sin empresa asignada'} · {c.last_message || '—'}</div>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                {c.bot_paused ? <Status s="blocked" /> : null}
                <span className="tiny dim">{ago(c.last_inbound_at || c.created_at)}</span>
              </div>
            </div>
          ))}
        </div></div>
      ) : <div className="empty"><b>Sin conversaciones</b>Aparecen cuando Chatwoot envía mensajes al webhook. Configuralo en Integraciones.</div>}
      {open && <ConversationSheet id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
