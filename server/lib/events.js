// Registro de eventos: fuente única para la actividad, las notificaciones y la animación de la oficina.
// Cada cambio real del sistema escribe un evento; la oficina solo anima lo que llega por aquí.
import { EventEmitter } from 'node:events';
import { q, j } from '../db.js';

export const bus = new EventEmitter();
bus.setMaxListeners(200);

const NOTIFY_TYPES = new Set([
  'approval.requested', 'task.failed', 'task.blocked', 'instruction.completed', 'integration.error',
  'spend.alert', 'conversation.handoff', 'automations.paused', 'priority.digest',
]);

export function emit(type, message, extra = {}) {
  const { level = 'info', company_id = null, client_id = null, agent_slug = null, task_id = null, instruction_id = null, data = {} } = extra;
  const notify = extra.notify ?? NOTIFY_TYPES.has(type);
  const r = q.run(
    `INSERT INTO events(type, level, company_id, client_id, agent_slug, task_id, instruction_id, message, data, notify)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    type, level, company_id, client_id, agent_slug, task_id, instruction_id, message, j.str(data), notify ? 1 : 0,
  );
  const ev = q.get('SELECT * FROM events WHERE id = ?', Number(r.lastInsertRowid));
  bus.emit('event', ev);
  return ev;
}

export function eventsSince(lastId, limit = 200) {
  return q.all('SELECT * FROM events WHERE id > ? ORDER BY id ASC LIMIT ?', lastId, limit);
}
