// Servicio de tareas: estados, dependencias y eventos. Toda transición queda registrada.
import { q, j, nowIso } from '../db.js';
import { emit } from '../lib/events.js';
import { enqueue, cancelJob } from '../lib/queue.js';

export const TERMINAL = new Set(['completed', 'failed', 'blocked', 'cancelled']);
const LABEL = {
  queued: 'en cola', running: 'trabajando', waiting_approval: 'esperando aprobación', blocked: 'bloqueada',
  failed: 'falló', completed: 'completada', cancelled: 'cancelada',
};

export function getTask(id) {
  const t = q.get('SELECT * FROM tasks WHERE id = ?', id);
  return t ? hydrate(t) : null;
}

export function hydrate(t) {
  return { ...t, params: j.parse(t.params, {}), depends_on: j.parse(t.depends_on, []), sources: j.parse(t.sources, []), result: j.parse(t.result, null) };
}

export function createTask(t) {
  const r = q.run(
    `INSERT INTO tasks(instruction_id, parent_id, company_id, client_id, agent_slug, kind, title, input, params, depends_on,
       status, cost_estimate_usd, max_cost_usd, created_by, due_at, is_demo, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?, 'queued', ?,?,?,?,?,?,?)`,
    t.instruction_id ?? null, t.parent_id ?? null, t.company_id ?? null, t.client_id ?? null, t.agent_slug, t.kind ?? 'agent',
    t.title, t.input ?? '', j.str(t.params ?? {}), j.str(t.depends_on ?? []), t.cost_estimate_usd ?? 0, t.max_cost_usd ?? null,
    t.created_by ?? null, t.due_at ?? null, t.is_demo ? 1 : 0, nowIso(), nowIso(),
  );
  const task = getTask(Number(r.lastInsertRowid));
  emit('task.created', `${task.title}`, { agent_slug: task.agent_slug, task_id: task.id, instruction_id: task.instruction_id, company_id: task.company_id, client_id: task.client_id, data: { status: 'queued' } });
  return task;
}

export function scheduleIfReady(task) {
  if (task.status !== 'queued') return false;
  const deps = task.depends_on.map((id) => q.get('SELECT id, status FROM tasks WHERE id = ?', id)).filter(Boolean);
  const soft = !!task.params.soft_deps || task.kind === 'consolidate';
  const notDone = deps.filter((d) => !TERMINAL.has(d.status) && d.status !== 'waiting_approval');
  if (notDone.length) return false;
  const bad = deps.filter((d) => ['failed', 'blocked', 'cancelled'].includes(d.status));
  if (bad.length && !soft) {
    setStatus(task.id, 'blocked', `Depende de la tarea #${bad[0].id}, que quedó ${LABEL[bad[0].status]}`);
    return false;
  }
  enqueue('task.run', { taskId: task.id }, { idempotencyKey: `task:${task.id}:run`, timeoutMs: task.params.timeout_ms ?? undefined });
  return true;
}

export function setStatus(id, status, reason = null, extra = {}) {
  const prev = q.get('SELECT status FROM tasks WHERE id = ?', id)?.status;
  const sets = ['status = ?', 'status_reason = ?', 'updated_at = ?'];
  const vals = [status, reason, nowIso()];
  if (status === 'running') { sets.push('started_at = COALESCE(started_at, ?)'); vals.push(nowIso()); }
  if (TERMINAL.has(status)) { sets.push('finished_at = ?'); vals.push(nowIso()); }
  for (const [k, v] of Object.entries(extra)) { sets.push(`${k} = ?`); vals.push(typeof v === 'object' && v !== null ? j.str(v) : v); }
  q.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, ...vals, id);
  const task = getTask(id);
  const level = { failed: 'error', blocked: 'warning', completed: 'success', waiting_approval: 'warning' }[status] || 'info';
  emit(`task.${status}`, `${task.title}: ${LABEL[status]}${reason ? ` — ${reason}` : ''}`,
    { level, agent_slug: task.agent_slug, task_id: id, instruction_id: task.instruction_id, company_id: task.company_id, client_id: task.client_id, data: { status, prev } });
  if (TERMINAL.has(status) || status === 'waiting_approval') onSettled(task);
  return task;
}

function onSettled(task) {
  // Liberar dependientes
  const dependents = q.all(`SELECT * FROM tasks WHERE status = 'queued' AND depends_on LIKE ?`, `%${task.id}%`).map(hydrate)
    .filter((t) => t.depends_on.includes(task.id));
  for (const d of dependents) scheduleIfReady(d);
  if (task.instruction_id) maybeFinishInstruction(task.instruction_id);
}

export function maybeFinishInstruction(instructionId) {
  const rows = q.all('SELECT status FROM tasks WHERE instruction_id = ?', instructionId);
  if (!rows.length) return;
  const open = rows.filter((r) => !TERMINAL.has(r.status) && r.status !== 'waiting_approval');
  if (open.length) return;
  const inst = q.get('SELECT * FROM instructions WHERE id = ?', instructionId);
  if (['completed', 'needs_attention'].includes(inst.status) && inst.finished_at) return;
  const needs = rows.some((r) => ['waiting_approval', 'blocked', 'failed'].includes(r.status));
  q.run('UPDATE instructions SET status = ?, finished_at = ? WHERE id = ?', needs ? 'needs_attention' : 'completed', nowIso(), instructionId);
  emit('instruction.completed', needs ? `Instrucción #${instructionId} lista, con acciones que requieren tu intervención` : `Instrucción #${instructionId} completada`,
    { level: needs ? 'warning' : 'success', instruction_id: instructionId, agent_slug: 'director', company_id: inst.company_id, client_id: inst.client_id });
}

export function cancelTask(id, userId) {
  const t = getTask(id);
  if (!t || TERMINAL.has(t.status)) return t;
  const job = q.get(`SELECT id FROM jobs WHERE idempotency_key = ?`, `task:${id}:run`);
  if (job) cancelJob(job.id);
  q.run(`UPDATE approvals SET status = 'expired' WHERE task_id = ? AND status = 'pending'`, id);
  return setStatus(id, 'cancelled', userId ? 'Cancelada por Demian' : 'Cancelada');
}

export function retryTask(id) {
  const t = getTask(id);
  if (!t || !['failed', 'blocked', 'cancelled'].includes(t.status)) return t;
  q.run(`DELETE FROM jobs WHERE idempotency_key = ? AND status IN ('completed','failed','dead','cancelled')`, `task:${id}:run`);
  q.run(`UPDATE tasks SET status = 'queued', status_reason = 'Reintento manual', finished_at = NULL, updated_at = ? WHERE id = ?`, nowIso(), id);
  if (t.instruction_id) q.run(`UPDATE instructions SET status = 'running', finished_at = NULL WHERE id = ?`, t.instruction_id);
  emit('task.queued', `${t.title}: en cola (reintento manual)`, { agent_slug: t.agent_slug, task_id: id, instruction_id: t.instruction_id, data: { status: 'queued' } });
  scheduleIfReady(getTask(id));
  return getTask(id);
}

export function addDeliverable(d) {
  const r = q.run(
    `INSERT INTO deliverables(task_id, instruction_id, company_id, client_id, agent_slug, kind, title, body, file_path, mime, size, sha256, meta, is_demo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    d.task_id ?? null, d.instruction_id ?? null, d.company_id ?? null, d.client_id ?? null, d.agent_slug ?? null, d.kind, d.title,
    d.body ?? null, d.file_path ?? null, d.mime ?? null, d.size ?? null, d.sha256 ?? null, j.str(d.meta ?? {}), d.is_demo ? 1 : 0,
  );
  const id = Number(r.lastInsertRowid);
  emit('deliverable.created', `Entregable: ${d.title}`, { level: 'success', agent_slug: d.agent_slug, task_id: d.task_id, instruction_id: d.instruction_id, company_id: d.company_id, client_id: d.client_id, data: { deliverable_id: id, kind: d.kind } });
  return id;
}
