// Primer arranque y credenciales cargadas desde la app (cifradas, nunca devueltas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';

const t = await setup('setup');
const { call, db } = t;

test('Credenciales: solo el dueño, cifradas en la base, nunca devueltas completas', async () => {
  const r = await call('PUT', '/api/secrets/ANTHROPIC_API_KEY', { value: 'sk-ant-api03-VALOR-SECRETO-1234' });
  assert.equal(r.status, 200);
  assert.equal(r.body.item.preview, '••••1234');
  const raw = db.q.get(`SELECT value FROM settings WHERE key = 'secrets_enc'`).value;
  assert.ok(!raw.includes('VALOR-SECRETO'), 'no se guarda en texto plano');
  const list = await call('GET', '/api/secrets');
  assert.ok(!JSON.stringify(list.body).includes('VALOR-SECRETO'));
  const { config } = await import('../server/config.js');
  assert.equal(config.anthropic.apiKey, 'sk-ant-api03-VALOR-SECRETO-1234', 'se aplica en caliente');
  t.auth.createUser({ email: 'adm@test.local', name: 'Admin', password: 'clave-admin-segura', role: 'admin' });
  const sid = await t.login('adm@test.local', 'clave-admin-segura');
  assert.equal((await call('GET', '/api/secrets', null, sid)).status, 403);
  const tok = await call('PUT', '/api/secrets/CHATWOOT_URL_TOKEN', { value: '__generate__' });
  assert.match(tok.body.webhook_url, /\/webhooks\/chatwoot\/[A-Za-z0-9_-]{20,}$/);
  await call('PUT', '/api/secrets/ANTHROPIC_API_KEY', { value: '' });
  assert.equal(config.anthropic.apiKey, undefined);
});

test('Primer arranque: alta del dueño solo con el código de instalación y una sola vez', async () => {
  const { config } = await import('../server/config.js');
  config.setupCode = 'ABCDE12345';
  assert.equal((await call('GET', '/api/setup/status', null, null)).body.needs_setup, false);
  assert.equal((await call('POST', '/api/setup', { code: 'ABCDE12345', email: 'otro@x.com', password: 'clave-larga-123' }, null)).status, 409, 'con dueño existente no se puede');
  db.q.run('DELETE FROM sessions'); db.q.run('DELETE FROM audit_log'); db.q.run('UPDATE approvals SET decided_by = NULL');
  db.q.run('UPDATE tasks SET created_by = NULL'); db.q.run('UPDATE instructions SET created_by = NULL'); db.q.run('UPDATE memory_items SET created_by = NULL');
  db.q.run('DELETE FROM users');
  assert.equal((await call('GET', '/api/setup/status', null, null)).body.needs_setup, true);
  assert.equal((await call('POST', '/api/setup', { code: 'MAL', email: 'a@x.com', password: 'clave-larga-123' }, null)).status, 401);
  const ok = await call('POST', '/api/setup', { code: 'abcde12345', email: 'demian@x.com', name: 'Demian', password: 'clave-larga-123' }, null);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, 'owner');
});

test('Cambio de contraseña exige la actual', async () => {
  const sid = await t.login('demian@x.com', 'clave-larga-123');
  assert.equal((await call('POST', '/api/me/password', { current: 'mala', next: 'nueva-clave-segura' }, sid)).status, 400);
  assert.equal((await call('POST', '/api/me/password', { current: 'clave-larga-123', next: 'nueva-clave-segura' }, sid)).status, 200);
  await t.login('demian@x.com', 'nueva-clave-segura');
});
