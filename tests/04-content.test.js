// Producción de contenido con Claude SIMULADO: plan → guion → reel MP4 real (ffmpeg) → QA → calendario.
// Las "fotos" son imágenes de prueba generadas (tests/fixtures), no fotos de clientes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { setup } from './helpers.js';
import { fileURLToPath } from 'node:url';

const t = await setup('content');
const { db, call } = t;
const llm = await import('../server/llm/anthropic.js');
const RUSHY = t.company('rushy');
const client = (await call('POST', '/api/clients', { company_id: RUSHY, name: 'Cliente Prueba Video', handle: '@cliente_prueba' })).body;
const other = (await call('POST', '/api/clients', { company_id: RUSHY, name: 'Otro Cliente' })).body;
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const ids = [];
for (const f of fs.readdirSync(fixtures).filter((x) => x.endsWith('.jpg'))) {
  const p = path.join(fixtures, f);
  const buf = fs.readFileSync(p);
  ids.push(Number(db.q.run(`INSERT INTO files(company_id, client_id, original_name, stored_path, mime, size, sha256, kind) VALUES (?,?,?,?,?,?,?,?)`, RUSHY, client.id, f, p, 'image/jpeg', buf.length, crypto.createHash('sha256').update(buf).digest('hex'), 'photo').lastInsertRowid));
}
const foreign = Number(db.q.run(`INSERT INTO files(company_id, client_id, original_name, stored_path, mime, size, sha256, kind) VALUES (?,?,?,?,?,?,?,?)`, RUSHY, other.id, 'ajena.jpg', path.join(fixtures, 'foto-prueba-cuadrada.jpg'), 'image/jpeg', 1, 'x', 'photo').lastInsertRowid);

// Claude SIMULADO: cada rol responde con complete_task; el guionista devuelve escenas (incluye una foto ajena para probar aislamiento).
llm.setLlmProvider(async (req) => {
  const isGuion = req.system.includes('Guionista de reels');
  const result = isGuion ? { scenes: [{ file_id: ids[0], text: 'Así arranca tu semana' }, { file_id: foreign, text: 'Foto de otro cliente' }, { file_id: ids[1], text: 'Hecho con fotos reales' }, { file_id: ids[2], text: 'Te esperamos' }], cta: 'Escribinos', handle: '@cliente_prueba' } : {};
  const uses = req.messages.length === 1 && !isGuion
    ? [{ type: 'tool_use', id: 'w1', name: 'write_deliverable', input: { title: 'Borrador (simulado)', body_markdown: 'Contenido generado por el proveedor SIMULADO de pruebas.' } }]
    : [{ type: 'tool_use', id: 'c1', name: 'complete_task', input: { summary: 'Listo (simulado)', status: 'completed', result } }];
  return { content: uses, stop_reason: 'tool_use', usage: { input_tokens: 500, output_tokens: 120, web_searches: 0 } };
});

test('Semana de contenido: tareas encadenadas y reel MP4 exportado con fotos reales del cliente', async () => {
  const inst = await call('POST', '/api/instructions', { text: 'Prepará la próxima semana de contenido de este cliente con sus fotos', company_id: RUSHY, client_id: client.id });
  assert.equal(inst.status, 200);
  await t.drain(240_000);
  const d = (await call('GET', `/api/instructions/${inst.body.id}`)).body;
  const by = Object.fromEntries(d.tasks.map((x) => [x.agent_slug, x]));
  for (const slug of ['estratega', 'guionista', 'redactor-social', 'editor-reels', 'qa-visual', 'calendario']) assert.equal(by[slug]?.status, 'completed', `${slug}: ${by[slug]?.status} ${by[slug]?.status_reason || ''}`);
  assert.ok(by['guionista'].depends_on.includes(by['estratega'].id), 'dependencias registradas');
  assert.ok(by['estratega'].cost_usd > 0, 'costo registrado por tarea');
  const video = d.deliverables.find((x) => x.kind === 'video');
  assert.ok(video, 'hay un video exportado');
  assert.deepEqual(video.meta.photos, [ids[0], ids[1], ids[2]], 'solo fotos del cliente, la ajena se descartó');
  assert.ok(video.meta.notes.some((n) => n.includes('no pertenece')));
  assert.equal(video.meta.qa.ok, true);
  globalThis.videoId = video.id;
});

test('9. El archivo de video exportado se reproduce correctamente', async () => {
  const id = globalThis.videoId;
  const del = db.q.get('SELECT * FROM deliverables WHERE id = ?', id);
  const { qaVideo } = await import('../server/content/reel.js');
  const r = await qaVideo(del.file_path, { expect: { width: 1080, height: 1920 } });
  assert.equal(r.ok, true, JSON.stringify(r.checks.filter((c) => !c.ok)));
  assert.ok(r.duration > 6);
  // Se sirve con soporte de rangos (necesario para reproducir en el celular)
  const sid = await t.login();
  const res = await t.app.inject({ method: 'GET', url: `/api/deliverables/${id}/file`, headers: { cookie: `dos_sid=${sid}`, range: 'bytes=0-1023' } });
  assert.equal(res.statusCode, 206);
  assert.equal(res.headers['content-type'], 'video/mp4');
  fs.copyFileSync(del.file_path, path.join(t.dir, 'evidencia-reel.mp4'));
  console.log(`# Evidencia: ${del.file_path} · ${r.duration.toFixed(2)} s · sha256 ${r.sha256}`);
});

test('Sin fotos suficientes el reel se bloquea con una indicación concreta', async () => {
  const empty = (await call('POST', '/api/clients', { company_id: RUSHY, name: 'Cliente Sin Fotos' })).body;
  const inst = await call('POST', '/api/instructions', { text: 'Exportá un reel con estas fotos', company_id: RUSHY, client_id: empty.id });
  await t.drain();
  const d = (await call('GET', `/api/instructions/${inst.body.id}`)).body;
  const reel = d.tasks.find((x) => x.agent_slug === 'editor-reels');
  assert.equal(reel.status, 'blocked');
  assert.match(reel.status_reason, /al menos 2/);
});
