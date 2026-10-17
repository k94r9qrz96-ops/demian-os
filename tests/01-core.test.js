// Núcleo: instrucciones → tareas reales, persistencia, oficina = backend, aislamiento, permisos, gasto y recuperación.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';

const t = await setup('core');
const { call, db, company } = t;
const EH = company('elite-hunters');
const RUSHY = company('rushy');

test('1. Una instrucción crea tareas reales y produce un resultado accesible', async () => {
  const s = await call('POST', '/api/recruiting/searches', { hiring_company: 'Empresa de Prueba', role_title: 'Vendedor de salón', guarantee_days: 90 });
  assert.equal(s.status, 200);
  const c = await call('POST', '/api/recruiting/candidates', { full_name: 'Persona de Prueba', search_id: s.body.id, consent: true });
  assert.equal(c.status, 200);
  const inst = await call('POST', '/api/instructions', { text: 'Organizá las entrevistas de esta búsqueda y mostrame qué falta' });
  assert.equal(inst.status, 200);
  assert.equal(inst.body.company_id, EH, 'el director identifica Elite Hunters');
  await t.drain();
  const detail = await call('GET', `/api/instructions/${inst.body.id}`);
  assert.equal(detail.body.status, 'completed');
  const coord = detail.body.tasks.find((x) => x.agent_slug === 'coord-busquedas');
  assert.equal(coord.status, 'completed');
  assert.ok(coord.started_at && coord.finished_at, 'fechas registradas');
  const report = detail.body.deliverables.find((d) => d.title.includes('qué falta'));
  assert.match(report.body, /agendar entrevista/);
  const summary = detail.body.deliverables.find((d) => d.title === 'Resumen del director');
  assert.ok(summary, 'el director consolida');
  const task = await call('GET', `/api/tasks/${coord.id}`);
  assert.equal(task.body.runs.length, 1, 'evidencia de ejecución');
  assert.ok(task.body.runs[0].steps.length >= 1);
});

test('2. Al recargar se conservan los datos (reapertura de la base)', async () => {
  const before = db.q.get('SELECT COUNT(*) c FROM tasks').c;
  db.closeDb();
  db.openDb();
  const after = db.q.get('SELECT COUNT(*) c FROM tasks').c;
  assert.equal(after, before);
  const r = await call('GET', '/api/instructions');
  assert.ok(r.body.length >= 1);
});

test('3. La oficina refleja el estado real del backend', async () => {
  const office = async () => (await call('GET', '/api/office')).body.agents.find((a) => a.slug === 'estratega');
  assert.equal((await office()).status, 'available', 'sin ejecución no aparece trabajando');
  const tasks = await import('../server/agents/tasks.js');
  const tk = tasks.createTask({ agent_slug: 'estratega', company_id: RUSHY, title: 'Prueba de estado', input: 'x' });
  assert.equal((await office()).status, 'queued');
  tasks.setStatus(tk.id, 'running');
  assert.equal((await office()).status, 'working');
  tasks.setStatus(tk.id, 'blocked', 'falta dato');
  assert.equal((await office()).status, 'blocked');
  const evs = (await call('GET', '/api/events?agent=estratega')).body.map((e) => e.type);
  assert.ok(evs.includes('task.running') && evs.includes('task.blocked'), 'cada cambio genera un evento para la animación');
});

test('6. Los datos de un cliente no aparecen en otro', async () => {
  const a = (await call('POST', '/api/clients', { company_id: RUSHY, name: 'Cliente A' })).body;
  const b = (await call('POST', '/api/clients', { company_id: RUSHY, name: 'Cliente B' })).body;
  await call('POST', '/api/memory', { company_id: RUSHY, client_id: a.id, kind: 'tone', content: 'SECRETO-DE-A' });
  await call('POST', '/api/memory', { company_id: RUSHY, client_id: b.id, kind: 'tone', content: 'tono de B' });
  db.q.run(`INSERT INTO files(company_id, client_id, original_name, stored_path, mime, size, sha256) VALUES (?,?,?,?,?,?,?)`, RUSHY, a.id, 'foto-a.jpg', '/dev/null', 'image/jpeg', 1, 'x');
  const { memoryFor, filesFor } = await import('../server/agents/tools.js');
  const { contextBlock } = await import('../server/agents/runner.js');
  const taskB = { company_id: RUSHY, client_id: b.id, depends_on: [] };
  assert.ok(!memoryFor(taskB).some((m) => m.content.includes('SECRETO-DE-A')));
  assert.equal(filesFor(taskB).length, 0);
  assert.ok(!contextBlock(taskB).includes('SECRETO-DE-A'), 'el contexto que ve Claude no incluye datos de otro cliente');
  const listB = await call('GET', `/api/memory?company_id=${RUSHY}&client_id=${b.id}`);
  assert.ok(!listB.body.some((m) => m.content.includes('SECRETO-DE-A')));
  // Usuario limitado a Rushy no ve Elite Hunters
  t.auth.createUser({ email: 'rushy@test.local', name: 'Operador Rushy', password: 'otra-clave-segura', role: 'admin', company_scope: ['rushy'] });
  const sid = await t.login('rushy@test.local', 'otra-clave-segura');
  assert.equal((await call('GET', `/api/memory?company_id=${EH}`, null, sid)).status, 403);
  assert.equal((await call('GET', '/api/recruiting/searches', null, sid)).status, 403);
  const tasksSeen = (await call('GET', '/api/tasks', null, sid)).body;
  assert.ok(!tasksSeen.some((x) => x.company_id === EH));
});

test('Permisos: sin sesión no hay acceso; un usuario de solo lectura no aprueba; CSRF', async () => {
  assert.equal((await call('GET', '/api/office', null, null)).status, 401);
  t.auth.createUser({ email: 'ver@test.local', name: 'Solo ver', password: 'clave-de-lectura', role: 'viewer' });
  const sid = await t.login('ver@test.local', 'clave-de-lectura');
  const { requestApproval } = await import('../server/agents/approvals.js');
  const a = requestApproval({ task: { id: null, company_id: RUSHY }, action: 'gmail_send', account: 'Gmail', recipient: 'x@y.com', summary: 'prueba', payload: { to: 'x@y.com', subject: 's', body_text: 'b' } });
  assert.equal((await call('POST', `/api/approvals/${a.id}/decide`, { decision: 'approve' }, sid)).status, 403);
  const noHeader = await t.app.inject({ method: 'POST', url: '/api/settings/pause', payload: { paused: true }, headers: { cookie: `dos_sid=${await t.login()}` } });
  assert.equal(noHeader.statusCode, 403, 'sin encabezado anti-CSRF se rechaza');
});

test('Límites de gasto bloquean la tarea y pausan si se supera el diario', async () => {
  const spend = await import('../server/lib/spend.js');
  const { BlockedError } = await import('../server/lib/util.js');
  assert.throws(() => spend.assertBudget({ cost_usd: 1.49, max_cost_usd: null }, 0.05), BlockedError);
  db.q.run(`INSERT INTO spend_ledger(provider, usd) VALUES ('anthropic', 50)`);
  assert.throws(() => spend.assertBudget(null, 0.01), /Límite diario/);
  const { getSetting, setSetting } = await import('../server/lib/util.js');
  assert.equal(getSetting('automations_paused'), true, 'pausa general automática');
  setSetting('automations_paused', false);
  db.q.run(`DELETE FROM spend_ledger`);
});

test('Pausa general: los trabajos automáticos no corren hasta reanudar', async () => {
  await call('POST', '/api/settings/pause', { paused: true });
  const tasks = await import('../server/agents/tasks.js');
  const tk = tasks.createTask({ agent_slug: 'prioridades', title: 'En pausa', input: 'x' });
  tasks.scheduleIfReady(tk);
  await new Promise((r) => setTimeout(r, 300));
  try { await t.drain(400); } catch { /* esperado: queda en cola */ }
  assert.equal(tasks.getTask(tk.id).status, 'queued');
  await call('POST', '/api/settings/pause', { paused: false });
  await t.drain();
  assert.equal(tasks.getTask(tk.id).status, 'completed');
});

test('Recuperación tras reinicio: un trabajo con lease vencido vuelve a la cola y termina', async () => {
  const tasks = await import('../server/agents/tasks.js');
  const tk = tasks.createTask({ agent_slug: 'prioridades', title: 'Recuperable', input: 'x' });
  db.q.run(`INSERT INTO jobs(type, payload, status, attempts, lease_until, idempotency_key) VALUES ('task.run', ?, 'running', 1, ?, ?)`, JSON.stringify({ taskId: tk.id }), new Date(Date.now() - 60_000).toISOString(), `task:${tk.id}:run`);
  db.q.run(`UPDATE tasks SET status = 'running' WHERE id = ?`, tk.id); // simulación: el proceso murió a mitad
  const n = t.queue.recoverStale();
  assert.equal(n, 1);
  await t.drain();
  assert.equal(tasks.getTask(tk.id).status, 'completed');
});

test('Sin Claude, los pedidos libres quedan bloqueados con explicación (no se inventa nada)', async () => {
  const inst = await call('POST', '/api/instructions', { text: 'Pensame un nombre para un producto nuevo' });
  await t.drain();
  const d = await call('GET', `/api/instructions/${inst.body.id}`);
  assert.equal(d.body.status, 'needs_attention');
  assert.match(d.body.tasks[0].status_reason, /ANTHROPIC_API_KEY/);
});
