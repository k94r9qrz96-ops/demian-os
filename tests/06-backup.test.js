// Respaldo y restauración: los datos vuelven completos, las credenciales del servidor se conservan
// y el archivo descargado no contiene credenciales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { setup } from './helpers.js';

const t = await setup('backup');
const { call, db, app } = t;

test('Descargar respaldo, borrar datos y restaurar', async () => {
  const rushy = t.company('rushy');
  db.q.run(`INSERT INTO clients(company_id, name) VALUES (?, 'Cliente de prueba')`, rushy);
  const { config } = await import('../server/config.js');
  fs.mkdirSync(path.join(config.filesDir, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(config.filesDir, 'uploads', 'foto.txt'), 'contenido');
  await call('PUT', '/api/secrets/ANTHROPIC_API_KEY', { value: 'sk-ant-api03-SECRETO-RESPALDO-9999' });

  const r = await app.inject({ method: 'GET', url: '/api/backup', headers: { cookie: `dos_sid=${await t.login()}` } });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-disposition'], /demian-os-respaldo-.*\.tar\.gz/);
  const archive = path.join(t.dir, 'r.tar.gz');
  fs.writeFileSync(archive, r.rawPayload);
  // El respaldo no lleva credenciales
  const x = fs.mkdtempSync(path.join(t.dir, 'x-'));
  execFileSync('tar', ['-xzf', archive, '-C', x]);
  const snap = new DatabaseSync(path.join(x, 'demian-os.sqlite'), { readOnly: true });
  assert.equal(snap.prepare(`SELECT COUNT(*) c FROM settings WHERE key = 'secrets_enc'`).get().c, 0);
  snap.close();
  assert.ok(fs.existsSync(path.join(x, 'files', 'uploads', 'foto.txt')));

  // Simular pérdida de datos
  db.q.run('DELETE FROM clients');
  fs.rmSync(config.filesDir, { recursive: true, force: true });
  const { restoreBackup } = await import('../server/lib/backup.js');
  const res = await restoreBackup(archive);
  assert.equal(res.clients, 1);
  assert.equal(db.q.get(`SELECT name FROM clients`).name, 'Cliente de prueba');
  assert.equal(fs.readFileSync(path.join(config.filesDir, 'uploads', 'foto.txt'), 'utf8'), 'contenido');
  assert.equal(config.anthropic.apiKey, 'sk-ant-api03-SECRETO-RESPALDO-9999', 'la credencial del servidor se conserva');
  const list = await call('GET', '/api/secrets', null, await t.login());
  assert.equal(list.body.items.find((s) => s.key === 'ANTHROPIC_API_KEY').source, 'app');
  await t.queue.stopWorker(); // la restauración reinicia el worker; en la prueba lo detenemos
});

test('Restaurar rechaza archivos que no son respaldos y solo lo puede hacer el dueño', async () => {
  const bad = path.join(t.dir, 'malo.tar.gz');
  fs.writeFileSync(path.join(t.dir, 'otro.txt'), 'x');
  execFileSync('tar', ['-czf', bad, '-C', t.dir, 'otro.txt']);
  const { restoreBackup } = await import('../server/lib/backup.js');
  await assert.rejects(() => restoreBackup(bad), /no es un respaldo/);
  assert.ok(db.q.get('SELECT COUNT(*) c FROM companies').c >= 3, 'la base sigue intacta');
  t.auth.createUser({ email: 'adm2@test.local', name: 'Admin', password: 'clave-admin-segura', role: 'admin' });
  const sid = await t.login('adm2@test.local', 'clave-admin-segura');
  assert.equal((await call('GET', '/api/backup', null, sid)).status, 403);
});
