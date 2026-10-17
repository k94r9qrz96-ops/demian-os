// Aprobaciones y acciones externas con idempotencia verificable.
// Regla: nada externo se ejecuta sin aprobación explícita o una regla de autonomía configurada por Demian.
// Antes de reintentar un envío, se verifica con el proveedor que no se haya realizado.
import { q, j, nowIso } from '../db.js';
import { emit } from '../lib/events.js';
import { enqueue } from '../lib/queue.js';
import { sha256, stableStringify, shortCode, getSetting, audit, redact } from '../lib/util.js';
import { getTask, setStatus } from './tasks.js';
import { providers } from '../integrations/registry.js';

export const ACTION_LABEL = {
  chatwoot_message: 'Enviar mensaje por WhatsApp (vía Chatwoot)',
  gmail_send: 'Enviar email (Gmail)',
  calendar_event: 'Crear evento en Google Calendar',
  metricool_schedule: 'Programar publicación (Metricool)',
};

export function autonomyFor(action, companySlug) {
  const rules = getSetting('autonomy')?.actions || {};
  return rules[`${action}:${companySlug}`] || rules[action] || 'approval';
}

export function requestApproval({ task, action, account, recipient, summary, payload, agentSlug, isDemo = false }) {
  if (!ACTION_LABEL[action]) throw new Error(`Acción no soportada: ${action}`);
  const payload_hash = sha256(stableStringify(payload));
  // Evitar duplicados de la misma propuesta dentro de la misma tarea
  const dup = q.get(`SELECT * FROM approvals WHERE task_id IS ? AND payload_hash = ? AND status IN ('pending','approved','executing','executed')`, task?.id ?? null, payload_hash);
  if (dup) return dup;
  let code;
  do { code = shortCode(); } while (q.get('SELECT 1 FROM approvals WHERE code = ?', code));
  const r = q.run(
    `INSERT INTO approvals(code, task_id, company_id, client_id, action, account, recipient, summary, payload, payload_hash, requested_by_agent, is_demo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    code, task?.id ?? null, task?.company_id ?? null, task?.client_id ?? null, action, account, recipient, summary, j.str(payload), payload_hash, agentSlug ?? task?.agent_slug ?? null, isDemo ? 1 : 0,
  );
  const approval = q.get('SELECT * FROM approvals WHERE id = ?', Number(r.lastInsertRowid));
  const companySlug = task?.company_id ? q.get('SELECT slug FROM companies WHERE id = ?', task.company_id)?.slug : null;
  if (autonomyFor(action, companySlug) === 'auto') {
    decide(approval.id, { user: null, decision: 'approve', via: 'regla', note: `Regla de autonomía: ${action}${companySlug ? `:${companySlug}` : ''} = auto` });
  } else {
    emit('approval.requested', `Aprobación ${code}: ${ACTION_LABEL[action]} → ${recipient}`, {
      level: 'warning', agent_slug: approval.requested_by_agent, task_id: approval.task_id, company_id: approval.company_id, client_id: approval.client_id,
      data: { approval_id: approval.id, code },
    });
  }
  return q.get('SELECT * FROM approvals WHERE id = ?', approval.id);
}

export function decide(approvalId, { user, decision, via = 'app', note = null, userAgent = null }) {
  const a = q.get('SELECT * FROM approvals WHERE id = ?', approvalId);
  if (!a) throw Object.assign(new Error('Aprobación inexistente'), { statusCode: 404 });
  if (a.status !== 'pending') throw Object.assign(new Error(`La aprobación ya está ${a.status}`), { statusCode: 409 });
  // Integridad: lo que se aprueba es exactamente lo que se mostró.
  if (sha256(stableStringify(j.parse(a.payload))) !== a.payload_hash) throw new Error('El contenido cambió después de solicitarse la aprobación');
  const approve = decision === 'approve';
  const snapshot = { action: a.action, account: a.account, recipient: a.recipient, summary: a.summary, payload: j.parse(a.payload), payload_hash: a.payload_hash, user_agent: userAgent };
  q.run(`UPDATE approvals SET status = ?, decided_by = ?, decided_via = ?, decided_at = ?, decision_note = ?, decision_snapshot = ? WHERE id = ?`,
    approve ? 'approved' : 'rejected', user?.id ?? null, via, nowIso(), note, j.str(snapshot), a.id);
  audit(user?.id, via, approve ? 'approval.approve' : 'approval.reject', `approval:${a.id}`, snapshot);
  emit(approve ? 'approval.approved' : 'approval.rejected', `${approve ? 'Aprobado' : 'Rechazado'} ${a.code}: ${ACTION_LABEL[a.action]} → ${a.recipient}${via !== 'app' ? ` (vía ${via})` : ''}`,
    { level: approve ? 'success' : 'info', agent_slug: a.requested_by_agent, task_id: a.task_id, company_id: a.company_id, client_id: a.client_id, data: { approval_id: a.id } });
  if (approve) enqueue('approval.execute', { approvalId: a.id }, { idempotencyKey: `approval:${a.id}:exec`, maxAttempts: 4, timeoutMs: 60_000 });
  else settleTaskIfDone(a.task_id);
  return q.get('SELECT * FROM approvals WHERE id = ?', a.id);
}

export async function executeApproval({ approvalId }) {
  const a = q.get('SELECT * FROM approvals WHERE id = ?', approvalId);
  if (!a || !['approved', 'executing'].includes(a.status)) return;
  q.run(`UPDATE approvals SET status = 'executing' WHERE id = ?`, a.id);
  const payload = j.parse(a.payload);
  const provider = providers[a.action];
  try {
    const action = await runExternal(`approval:${a.id}`, a.action, provider, payload);
    q.run(`UPDATE approvals SET status = 'executed', executed_at = ?, external_action_id = ? WHERE id = ?`, nowIso(), action.id, a.id);
    emit('approval.executed', `${ACTION_LABEL[a.action]} confirmado por el servicio (${provider.name} id ${action.external_id})`, {
      level: 'success', agent_slug: a.requested_by_agent, task_id: a.task_id, company_id: a.company_id, client_id: a.client_id,
      data: { approval_id: a.id, external_id: action.external_id },
    });
    settleTaskIfDone(a.task_id);
  } catch (e) {
    const final = e.noRetry;
    q.run(`UPDATE approvals SET status = ?, error = ? WHERE id = ?`, final ? 'failed' : 'executing', redact(e.message), a.id);
    if (final) {
      emit('approval.failed', `No se pudo ejecutar ${a.code}: ${redact(e.message)}`, { level: 'error', agent_slug: a.requested_by_agent, task_id: a.task_id, data: { approval_id: a.id } });
      settleTaskIfDone(a.task_id);
    }
    throw e;
  }
}
executeApproval.onFinalFailure = (payload, err) => {
  q.run(`UPDATE approvals SET status = 'failed', error = ? WHERE id = ? AND status = 'executing'`, redact(err.message), payload.approvalId);
  const a = q.get('SELECT * FROM approvals WHERE id = ?', payload.approvalId);
  emit('approval.failed', `No se pudo ejecutar ${a.code} tras varios intentos: ${redact(err.message)}`, { level: 'error', task_id: a.task_id, data: { approval_id: a.id } });
  settleTaskIfDone(a.task_id);
};

function settleTaskIfDone(taskId) {
  if (!taskId) return;
  const t = getTask(taskId);
  if (!t || t.status !== 'waiting_approval') return;
  const open = q.get(`SELECT COUNT(*) c FROM approvals WHERE task_id = ? AND status IN ('pending','approved','executing')`, taskId).c;
  if (open) return;
  const failed = q.get(`SELECT COUNT(*) c FROM approvals WHERE task_id = ? AND status = 'failed'`, taskId).c;
  setStatus(taskId, failed ? 'failed' : 'completed', failed ? 'Una acción aprobada no pudo ejecutarse' : 'Acciones resueltas');
}

/**
 * Ejecuta una acción externa una sola vez.
 * provider: { name, execute(payload, key) → {external_id, confirmation}, verify(payload, key, row) → {external_id, confirmation}|null }
 */
export async function runExternal(key, kind, provider, payload) {
  const reqHash = sha256(stableStringify(payload));
  q.run(`INSERT OR IGNORE INTO external_actions(idempotency_key, kind, provider, request, request_hash) VALUES (?,?,?,?,?)`,
    key, kind, provider.name, j.str(payload), reqHash);
  let row = q.get('SELECT * FROM external_actions WHERE idempotency_key = ?', key);
  if (row.request_hash !== reqHash) throw Object.assign(new Error('La acción cambió respecto de la aprobada'), { noRetry: true });
  if (row.status === 'confirmed') return row;
  if (['attempting', 'unknown'].includes(row.status) && row.attempts > 0) {
    const found = await provider.verify(payload, key, row);
    if (found) {
      q.run(`UPDATE external_actions SET status = 'confirmed', external_id = ?, confirmation = ?, updated_at = ? WHERE id = ?`,
        String(found.external_id), j.str(found.confirmation), nowIso(), row.id);
      emit('external.verified', `Verificado: la acción ${key} ya se había realizado (${provider.name} id ${found.external_id}); no se repite`, { level: 'info' });
      return q.get('SELECT * FROM external_actions WHERE id = ?', row.id);
    }
  }
  q.run(`UPDATE external_actions SET status = 'attempting', attempts = attempts + 1, updated_at = ? WHERE id = ?`, nowIso(), row.id);
  try {
    const res = await provider.execute(payload, key);
    q.run(`UPDATE external_actions SET status = 'confirmed', external_id = ?, confirmation = ?, delivery_status = ?, last_error = NULL, updated_at = ? WHERE id = ?`,
      String(res.external_id), j.str(res.confirmation), res.delivery_status ?? null, nowIso(), row.id);
  } catch (e) {
    q.run(`UPDATE external_actions SET status = ?, last_error = ?, updated_at = ? WHERE id = ?`, e.noRetry ? 'failed' : 'unknown', redact(e.message), nowIso(), row.id);
    throw e;
  }
  return q.get('SELECT * FROM external_actions WHERE id = ?', row.id);
}
