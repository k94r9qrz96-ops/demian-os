// Registro de trabajos en segundo plano y programación de tareas.
import { q, j, nowIso } from './db.js';
import { registerHandler, enqueue } from './lib/queue.js';
import { bus } from './lib/events.js';
import { runTask } from './agents/runner.js';
import { planInstruction } from './agents/director.js';
import { executeApproval } from './agents/approvals.js';
import { respondToConversation, notifyConversation } from './channels/chatwoot-handler.js';
import { createTask, scheduleIfReady } from './agents/tasks.js';
import { testIntegration, INTEGRATIONS } from './integrations/registry.js';

export function registerJobs() {
  registerHandler('task.run', runTask, { concurrency: 2 });
  registerHandler('director.plan', planInstruction, { concurrency: 2 });
  registerHandler('approval.execute', executeApproval, { concurrency: 2 });
  registerHandler('conversation.respond', respondToConversation, { concurrency: 3 });
  registerHandler('conversation.notify', notifyConversation);
  registerHandler('monitor.check', async () => {
    for (const d of INTEGRATIONS) if (d.key !== 'claude') await testIntegration(d.key); // Claude se prueba a mano (cuesta tokens)
  });
  registerHandler('priorities.daily', async () => {
    const t = createTask({ agent_slug: 'prioridades', title: 'Prioridades del día', input: 'Revisión diaria programada' });
    scheduleIfReady(t);
  });

  // Avisar por WhatsApp cuando termina una instrucción que llegó por WhatsApp
  bus.on('event', (ev) => {
    if (ev.type !== 'instruction.completed' || !ev.instruction_id) return;
    const inst = q.get('SELECT * FROM instructions WHERE id = ?', ev.instruction_id);
    if (inst?.source !== 'whatsapp' || !inst.source_ref) return;
    const approvals = q.all(`SELECT code, recipient FROM approvals WHERE status = 'pending' AND task_id IN (SELECT id FROM tasks WHERE instruction_id = ?)`, inst.id);
    const text = `📋 Instrucción #${inst.id} lista: ${inst.summary || ''}${approvals.length ? `\nPara aprobar respondé: ${approvals.map((a) => `APROBAR ${a.code} (${a.recipient})`).join(' · ')}` : ''}\nDetalle completo en Demian OS.`;
    enqueue('conversation.notify', { conversationId: Number(inst.source_ref), text, key: `instruction:${inst.id}` }, { idempotencyKey: `notify:instruction:${inst.id}`, automation: false });
  });
}

const SCHEDULES = [
  { name: 'monitor', every_minutes: 15, job_type: 'monitor.check' },
  { name: 'prioridades-diarias', every_minutes: 1440, job_type: 'priorities.daily', at_local_hour: 8 },
];

function nextRun(s, from = Date.now()) {
  if (s.at_local_hour === undefined) return new Date(from + s.every_minutes * 60_000).toISOString();
  // Próximas 08:00 en Buenos Aires (UTC-3, sin horario de verano)
  const d = new Date(from);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.at_local_hour + 3, 0, 0));
  if (target.getTime() <= from) target.setUTCDate(target.getUTCDate() + 1);
  return target.toISOString();
}

export function startScheduler() {
  for (const s of SCHEDULES)
    q.run('INSERT OR IGNORE INTO schedules(name, every_minutes, job_type, next_run_at) VALUES (?,?,?,?)', s.name, s.every_minutes, s.job_type, nextRun(s, Date.now() - (s.at_local_hour === undefined ? s.every_minutes * 60_000 - 60_000 : 0)));
  const tick = () => {
    for (const row of q.all(`SELECT * FROM schedules WHERE enabled = 1 AND next_run_at <= ?`, nowIso())) {
      const def = SCHEDULES.find((s) => s.name === row.name) || row;
      // Idempotencia por franja: un reinicio no duplica la ejecución programada.
      enqueue(row.job_type, j.parse(row.payload, {}), { idempotencyKey: `sched:${row.name}:${row.next_run_at}`, maxAttempts: 2 });
      q.run('UPDATE schedules SET last_run_at = ?, next_run_at = ? WHERE name = ?', nowIso(), nextRun(def), row.name);
    }
  };
  tick();
  return setInterval(tick, 30_000);
}
