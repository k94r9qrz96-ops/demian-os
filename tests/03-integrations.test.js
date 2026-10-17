// Integraciones caídas, recuperación y acciones externas idempotentes (Chatwoot SIMULADO).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, mockChatwoot } from './helpers.js';

const cw = await mockChatwoot({ dropResponseOnFirstSend: true });
const t = await setup('integrations', { CHATWOOT_BASE_URL: cw.url, CHATWOOT_ACCOUNT_ID: '1', CHATWOOT_USER_TOKEN: 'tok-user', CHATWOOT_BOT_TOKEN: 'tok-bot', CHATWOOT_WEBHOOK_SECRET: 's' });
const { db, call } = t;
after(async () => { await cw.close(); });

test('8. Una integración caída muestra error y permite recuperación', async () => {
  let r = await call('POST', '/api/integrations/chatwoot/test');
  assert.equal(r.body.status, 'connected');
  cw.state.down = true;
  r = await call('POST', '/api/integrations/chatwoot/test');
  assert.equal(r.body.status, 'error');
  assert.match(r.body.detail, /no responde/);
  assert.ok(r.body.help.length > 20, 'explica qué hacer');
  const evs = (await call('GET', '/api/events?notify=1')).body;
  assert.ok(evs.some((e) => e.type === 'integration.error'), 'notificación de error');
  cw.state.down = false;
  r = await call('POST', '/api/integrations/chatwoot/test');
  assert.equal(r.body.status, 'connected');
  assert.ok((await call('GET', '/api/events')).body.some((e) => e.type === 'integration.recovered'));
  const list = (await call('GET', '/api/integrations')).body;
  for (const i of list) assert.ok(['connected', 'pending_auth', 'insufficient_permissions', 'error', 'unavailable'].includes(i.status), `${i.key}: ${i.status}`);
  assert.equal(list.find((i) => i.key === 'google_gmail').status, 'unavailable');
});

test('10. Acción externa autorizada → confirmación verificable, sin duplicar aunque se pierda la respuesta', async () => {
  const conv = Number(db.q.run(`INSERT INTO conversations(provider, external_id, account_id, inbox_id, company_id, last_inbound_at) VALUES ('chatwoot','88','1','7',?,?)`, t.company('rushy'), new Date().toISOString()).lastInsertRowid);
  const { requestApproval } = await import('../server/agents/approvals.js');
  const a = requestApproval({ task: { id: null, company_id: t.company('rushy') }, action: 'chatwoot_message', account: 'Chatwoot · inbox 7', recipient: 'Cliente', summary: 'prueba', payload: { conversation_id: '88', local_conversation_id: conv, content: 'Mensaje único' } });
  const r = await call('POST', `/api/approvals/${a.id}/decide`, { decision: 'approve', payload_hash: a.payload_hash });
  assert.equal(r.status, 200);
  await t.drain(30_000); // primer intento: Chatwoot procesa pero corta la conexión → estado "unknown" → reintento verifica
  const row = db.q.get('SELECT * FROM approvals WHERE id = ?', a.id);
  assert.equal(row.status, 'executed');
  const ea = db.q.get('SELECT * FROM external_actions WHERE id = ?', row.external_action_id);
  assert.equal(ea.status, 'confirmed');
  assert.match(ea.confirmation, /verified_by/, 'se verificó con el proveedor antes de reintentar');
  assert.equal(cw.state.messages.filter((m) => m.content === 'Mensaje único').length, 1, 'el mensaje se envió UNA sola vez');
  const snap = JSON.parse(row.decision_snapshot);
  assert.equal(snap.payload.content, 'Mensaje único');
  assert.equal(snap.payload_hash, a.payload_hash);
  const audit = db.q.get(`SELECT * FROM audit_log WHERE action = 'approval.approve' AND target = ?`, `approval:${a.id}`);
  assert.ok(audit, 'registro de auditoría de la aprobación');
});

test('Una aprobación no puede decidirse dos veces ni con contenido distinto al mostrado', async () => {
  const { requestApproval } = await import('../server/agents/approvals.js');
  const a = requestApproval({ task: { id: null, company_id: t.company('rushy') }, action: 'gmail_send', account: 'Gmail', recipient: 'a@b.com', summary: 'x', payload: { to: 'a@b.com', subject: 'S', body_text: 'B' } });
  assert.equal((await call('POST', `/api/approvals/${a.id}/decide`, { decision: 'approve', payload_hash: 'otro' })).status, 409);
  assert.equal((await call('POST', `/api/approvals/${a.id}/decide`, { decision: 'reject' })).status, 200);
  assert.equal((await call('POST', `/api/approvals/${a.id}/decide`, { decision: 'approve' })).status, 409);
});

test('Gmail sin autorizar: la acción aprobada falla con explicación y no se declara enviada', async () => {
  const { requestApproval } = await import('../server/agents/approvals.js');
  const a = requestApproval({ task: { id: null, company_id: t.company('rushy') }, action: 'gmail_send', account: 'Gmail', recipient: 'a@b.com', summary: 'x', payload: { to: 'a@b.com', subject: 'S2', body_text: 'B2' } });
  await call('POST', `/api/approvals/${a.id}/decide`, { decision: 'approve' });
  await t.drain(20_000);
  const row = db.q.get('SELECT * FROM approvals WHERE id = ?', a.id);
  assert.equal(row.status, 'failed');
  assert.match(row.error, /Google no autorizado/);
  assert.equal(row.executed_at, null);
});
