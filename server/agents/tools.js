// Herramientas que los agentes pueden usar. Cada una aplica el alcance de la tarea (empresa y cliente):
// un agente trabajando para un cliente nunca ve datos de otro cliente.
import { q, j, isoIn } from '../db.js';
import { addDeliverable } from './tasks.js';
import { requestApproval, ACTION_LABEL } from './approvals.js';
import { isConnected } from '../integrations/registry.js';
import { google } from '../integrations/google.js';

export function scopeWhere(task, alias = '') {
  const a = alias ? `${alias}.` : '';
  if (task.client_id) return { sql: `${a}company_id = ? AND (${a}client_id IS NULL OR ${a}client_id = ?)`, params: [task.company_id, task.client_id] };
  return { sql: `${a}company_id = ? AND ${a}client_id IS NULL`, params: [task.company_id] };
}

export function memoryFor(task, { query = '', kind = null, limit = 30 } = {}) {
  if (!task.company_id) return [];
  const s = scopeWhere(task);
  const rows = q.all(`SELECT id, kind, title, content, source, source_date, client_id FROM memory_items WHERE ${s.sql} AND deleted_at IS NULL
    ${kind ? 'AND kind = ?' : ''} ${query ? 'AND (content LIKE ? OR title LIKE ?)' : ''} ORDER BY client_id IS NULL, updated_at DESC LIMIT ?`,
  ...s.params, ...(kind ? [kind] : []), ...(query ? [`%${query}%`, `%${query}%`] : []), limit);
  return rows.map((r) => ({ ...r, content: r.content.slice(0, 1500), scope: r.client_id ? 'cliente' : 'empresa' }));
}

export function filesFor(task, { kind = 'all' } = {}) {
  if (!task.company_id) return [];
  const where = task.client_id ? 'company_id = ? AND client_id = ?' : 'company_id = ? AND client_id IS NULL';
  const params = task.client_id ? [task.company_id, task.client_id] : [task.company_id];
  const mime = kind === 'photo' ? `AND mime LIKE 'image/%'` : kind === 'audio' ? `AND mime LIKE 'audio/%'` : kind === 'document' ? `AND mime NOT LIKE 'image/%' AND mime NOT LIKE 'audio/%' AND mime NOT LIKE 'video/%'` : '';
  return q.all(`SELECT id, original_name, mime, size, kind, source, license_note, created_at, stored_path FROM files WHERE ${where} AND deleted_at IS NULL ${mime} ORDER BY id`, ...params);
}

export function depResults(task) {
  return task.depends_on.map((id) => {
    const t = q.get('SELECT id, title, agent_slug, status, status_reason, result_summary, result FROM tasks WHERE id = ?', id);
    if (!t) return null;
    const dels = q.all('SELECT id, kind, title, body, meta FROM deliverables WHERE task_id = ?', id)
      .map((d) => ({ id: d.id, kind: d.kind, title: d.title, body: d.body?.slice(0, 6000), meta: j.parse(d.meta, {}) }));
    return { ...t, result: j.parse(t.result, null), deliverables: dels };
  }).filter(Boolean);
}

export function conversationsFor(task, { onlyPending = false, limit = 20 } = {}) {
  if (!task.company_id) return [];
  const s = scopeWhere(task, 'c');
  const convs = q.all(`SELECT c.*, ct.name contact_name, ct.phone contact_phone FROM conversations c LEFT JOIN contacts ct ON ct.id = c.contact_id
    WHERE ${s.sql} AND c.mode = 'external' ORDER BY COALESCE(c.last_inbound_at, c.created_at) DESC LIMIT ?`, ...s.params, limit * 3);
  const out = [];
  for (const c of convs) {
    const msgs = q.all('SELECT direction, sender_type, content, created_at, private FROM messages WHERE conversation_id = ? AND private = 0 ORDER BY id DESC LIMIT 8', c.id).reverse();
    const last = msgs[msgs.length - 1];
    const windowOpen = !!c.last_inbound_at && Date.parse(c.last_inbound_at) > Date.now() - 24 * 3600_000;
    const pendingReply = last?.direction === 'in';
    const lastOut = [...msgs].reverse().find((m) => m.direction === 'out');
    const coldFollowUp = last?.direction === 'out' && lastOut && Date.parse(lastOut.created_at) < Date.now() - 3 * 86400_000;
    if (onlyPending && !pendingReply && !coldFollowUp) continue;
    out.push({ id: c.id, chatwoot_id: c.external_id, contact: c.contact_name || c.contact_phone || 'sin nombre', bot_paused: !!c.bot_paused,
      window_open: windowOpen, pending_reply: pendingReply, cold_follow_up: !!coldFollowUp, last_inbound_at: c.last_inbound_at, messages: msgs });
    if (out.length >= limit) break;
  }
  return out;
}

export function recruitingFor(task, { searchId = null } = {}) {
  const eh = q.get(`SELECT id FROM companies WHERE slug = 'elite-hunters'`);
  if (task.company_id !== eh.id) return { error: 'El módulo de selección pertenece a Elite Hunters' };
  const searches = q.all(`SELECT * FROM rec_searches WHERE company_id = ? ${searchId ? 'AND id = ?' : ''} ORDER BY id DESC`, eh.id, ...(searchId ? [searchId] : []));
  return searches.map((s) => ({
    ...s,
    applications: q.all(`SELECT a.*, c.full_name, c.phone, c.email, c.videocv_file_id, c.cv_file_id, c.consent_at FROM rec_applications a
      JOIN rec_candidates c ON c.id = a.candidate_id WHERE a.search_id = ? ORDER BY a.id`, s.id).map((a) => ({
      ...a, interviews: q.all('SELECT * FROM rec_interviews WHERE application_id = ? ORDER BY id', a.id),
    })),
  }));
}

// ---- Definiciones para Claude (tool use) ----
export function toolSchemas(agent) {
  const defs = {
    memory_search: { description: 'Busca en la memoria de la empresa/cliente de esta tarea (instrucciones, tono, restricciones, antecedentes). Devuelve fuente y fecha.', input_schema: { type: 'object', properties: { query: { type: 'string' }, kind: { type: 'string', enum: ['instruction', 'tone', 'restriction', 'fact', 'document', 'public_info'] } } } },
    files_list: { description: 'Lista archivos reales de la empresa/cliente de esta tarea (fotos, documentos, audios).', input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['photo', 'document', 'audio', 'all'] } } } },
    task_results: { description: 'Devuelve resultados y entregables de las tareas de las que depende esta tarea.', input_schema: { type: 'object', properties: {} } },
    write_deliverable: { description: 'Guarda un entregable en markdown para Demian.', input_schema: { type: 'object', properties: { title: { type: 'string' }, body_markdown: { type: 'string' } }, required: ['title', 'body_markdown'] } },
    conversations_read: { description: 'Lee conversaciones de clientes/candidatos registradas (con estado de ventana de 24 h de WhatsApp).', input_schema: { type: 'object', properties: { only_pending: { type: 'boolean' }, limit: { type: 'integer', maximum: 30 } } } },
    recruiting_read: { description: 'Lee búsquedas, postulaciones, entrevistas y permanencias de Elite Hunters.', input_schema: { type: 'object', properties: { search_id: { type: 'integer' } } } },
    calendar_read: { description: 'Lista eventos próximos de Google Calendar (si está conectado).', input_schema: { type: 'object', properties: { days: { type: 'integer', maximum: 30 } } } },
    request_approval: {
      description: 'Propone una acción externa. NO la ejecuta: Demian la aprueba o rechaza. Indicá exactamente el contenido.',
      input_schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: agent.permissions.approvals || [] },
          recipient_label: { type: 'string', description: 'Destinatario legible (nombre y número/email)' },
          summary: { type: 'string', description: 'Por qué se propone' },
          conversation_id: { type: 'integer', description: 'chatwoot_message: id interno de conversación (de conversations_read)' },
          content: { type: 'string', description: 'chatwoot_message: texto exacto a enviar' },
          to: { type: 'string', description: 'gmail_send: email destinatario' },
          subject: { type: 'string' }, body: { type: 'string' },
          start: { type: 'string', description: 'calendar_event: ISO 8601 con zona' }, end: { type: 'string' }, title: { type: 'string' },
          attendees: { type: 'array', items: { type: 'string' } },
        },
        required: ['action', 'recipient_label', 'summary'],
      },
    },
  };
  const out = agent.tools.filter((t) => defs[t]).map((t) => ({ name: t, ...defs[t] }));
  if (!(agent.permissions.approvals || []).length) return out.filter((t) => t.name !== 'request_approval').concat(completeTool);
  return out.concat(completeTool);
}

const completeTool = {
  name: 'complete_task',
  description: 'Terminá la tarea. status=blocked si falta información o acceso real (listá qué falta).',
  input_schema: { type: 'object', properties: { summary: { type: 'string' }, status: { type: 'string', enum: ['completed', 'blocked'] }, missing: { type: 'array', items: { type: 'string' } }, result: { type: 'object' } }, required: ['summary', 'status'] },
};

export async function runTool(name, input, ctx) {
  const { task, agent } = ctx;
  if (name !== 'complete_task' && !agent.tools.includes(name)) return { error: `La herramienta ${name} no está permitida para este rol` };
  switch (name) {
    case 'memory_search': return memoryFor(task, input);
    case 'files_list': return filesFor(task, input).map(({ stored_path, ...f }) => f);
    case 'task_results': return depResults(task);
    case 'write_deliverable': {
      const id = addDeliverable({ task_id: task.id, instruction_id: task.instruction_id, company_id: task.company_id, client_id: task.client_id, agent_slug: agent.slug, kind: 'markdown', title: String(input.title).slice(0, 160), body: String(input.body_markdown), is_demo: task.is_demo });
      ctx.deliverables.push(id);
      return { ok: true, deliverable_id: id };
    }
    case 'conversations_read': return conversationsFor(task, { onlyPending: !!input.only_pending, limit: input.limit || 15 });
    case 'recruiting_read': return recruitingFor(task, { searchId: input.search_id });
    case 'calendar_read': {
      if (!isConnected('google_calendar')) return { error: 'Google Calendar no está conectado (pendiente de autorización)' };
      const r = await google.listEvents('primary', new Date().toISOString(), isoIn((input.days || 7) * 86400_000));
      return (r.items || []).map((e) => ({ summary: e.summary, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date }));
    }
    case 'request_approval': return proposeAction(input, ctx);
    default: return { error: `Herramienta desconocida: ${name}` };
  }
}

export function proposeAction(input, ctx) {
  const { task, agent } = ctx;
  if (!(agent.permissions.approvals || []).includes(input.action)) return { error: `Este rol no puede proponer ${input.action}` };
  let payload, account;
  if (input.action === 'chatwoot_message') {
    const s = scopeWhere(task, 'c');
    const conv = q.get(`SELECT c.* FROM conversations c WHERE c.id = ? AND ${s.sql}`, input.conversation_id, ...s.params);
    if (!conv) return { error: 'Conversación inexistente o fuera del alcance de esta empresa/cliente' };
    if (!input.content?.trim()) return { error: 'Falta el texto exacto' };
    const windowOpen = conv.last_inbound_at && Date.parse(conv.last_inbound_at) > Date.now() - 24 * 3600_000;
    if (!windowOpen) return { error: 'La ventana de 24 h de WhatsApp está cerrada: solo puede enviarse una plantilla aprobada por Meta. Dejalo indicado como pendiente.' };
    payload = { conversation_id: conv.external_id, local_conversation_id: conv.id, content: input.content.trim() };
    account = `Chatwoot · inbox ${conv.inbox_id ?? '?'} · conversación ${conv.external_id}`;
  } else if (input.action === 'gmail_send') {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.to || '')) return { error: 'Email destinatario inválido' };
    payload = { to: input.to, subject: String(input.subject || '').slice(0, 200), body_text: String(input.body || '') };
    account = 'Gmail de Demian (OAuth)';
  } else if (input.action === 'calendar_event') {
    if (!input.start || !input.end || Number.isNaN(Date.parse(input.start))) return { error: 'Fechas inválidas' };
    payload = { calendar_id: 'primary', summary: input.title || input.summary, description: input.summary, start: input.start, end: input.end, attendees: input.attendees || [], send_invites: false };
    account = 'Google Calendar · primario';
  } else if (input.action === 'metricool_schedule') {
    payload = { blog_id: input.blog_id || null, body: { text: input.content, publicationDate: input.start } };
    account = 'Metricool';
  } else return { error: 'Acción no soportada' };
  const a = requestApproval({ task, action: input.action, account, recipient: input.recipient_label, summary: input.summary, payload, agentSlug: agent.slug, isDemo: !!task.is_demo });
  ctx.approvals.push(a.id);
  return { ok: true, approval_code: a.code, status: a.status, note: `Pendiente de aprobación de Demian: ${ACTION_LABEL[input.action]}` };
}
