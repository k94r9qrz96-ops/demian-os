// Fichaje: vacante → postulación → ranking → límite gratis → desbloqueo por el dueño.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.js';

const t = await setup('fichaje', { FICHAJE_WHATSAPP: '+54 9 11 5555-0000', FICHAJE_FREE_CANDIDATES: '2' });
const { app, call } = t;
const pub = async (method, url, payload, headers = {}) => {
  const r = await app.inject({ method, url, payload, headers: { 'x-requested-with': 'fichaje', ...headers } });
  let body; try { body = r.json(); } catch { body = r.body; }
  return { status: r.statusCode, body, headers: r.headers };
};

const vacancy = {
  title: 'Vendedor de salón', company_name: 'Muebles Norte', location: 'Córdoba', salary: '$900.000 + comisiones',
  description: 'Atención al cliente en salón de ventas de muebles, cierre de ventas, seguimiento de clientes por WhatsApp y armado de presupuestos.',
  must_haves: 'Experiencia en ventas\nDisponibilidad sábados', contact_whatsapp: '+54 9 351 000 0000',
};
let v;

test('Landing y página de postulación se sirven con su CSS/JS', async () => {
  const l = await app.inject({ url: '/fichaje' });
  assert.equal(l.statusCode, 200);
  assert.match(l.body, /Recibí a los mejores/);
  assert.ok(!l.body.includes('{{'), 'sin variables sin reemplazar');
  assert.equal((await app.inject({ url: '/fichaje/assets/fichaje.js' })).statusCode, 200);
  assert.equal((await app.inject({ url: '/fichaje/assets/../routes.js' })).statusCode, 404);
});

test('Crear vacante sin Claude: kit por plantilla, validaciones y anti-CSRF', async () => {
  assert.equal((await app.inject({ method: 'POST', url: '/fichaje/api/vacancies', payload: vacancy })).statusCode, 403);
  assert.equal((await pub('POST', '/fichaje/api/vacancies', { ...vacancy, contact_whatsapp: '' })).status, 400);
  const r = await pub('POST', '/fichaje/api/vacancies', vacancy);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.kit_source, 'plantilla');
  assert.match(r.body.panel_url, /\/v\/\w+\/panel#k=/);
  v = r.body;
  const p = await pub('GET', `/fichaje/api/v/${v.slug}`);
  assert.equal(p.body.questions.filter((q) => q.type === 'knockout').length, 2);
  assert.ok(p.body.questions.every((q) => q.expect === undefined && q.weight === undefined), 'no filtra respuestas esperadas');
  const page = await app.inject({ url: `/v/${v.slug}` });
  assert.match(page.body, /og:title" content="Muebles Norte busca Vendedor de salón/);
});

const answersFor = (questions, good) => Object.fromEntries(questions.map((q) => [q.id,
  q.type === 'knockout' ? (good ? 'Sí' : 'No') : q.type === 'choice' ? q.options[0]
    : good ? 'En mi último salón de muebles cerré 38 ventas en un mes, armando presupuestos y haciendo seguimiento de clientes por WhatsApp.' : 'me gusta']));

test('Postulaciones se puntúan: excluyente fallado queda descartado; buena respuesta sube', async () => {
  const { questions } = (await pub('GET', `/fichaje/api/v/${v.slug}`)).body;
  const good = await pub('POST', `/fichaje/api/v/${v.slug}/apply`, { name: 'Lucía Martínez', contact: '+54 9 351 111 1111', answers: answersFor(questions, true) });
  assert.equal(good.status, 200, JSON.stringify(good.body));
  const bad = await pub('POST', `/fichaje/api/v/${v.slug}/apply`, { name: 'Diego Sosa', contact: 'diego@x.com', answers: answersFor(questions, false) });
  assert.equal(bad.status, 200);
  assert.equal((await pub('POST', `/fichaje/api/v/${v.slug}/apply`, { name: 'Lucía', contact: '+54 9 351 111 1111', answers: answersFor(questions, true) })).status, 409, 'sin duplicados');
  assert.equal((await pub('POST', `/fichaje/api/v/${v.slug}/apply`, { name: 'X', contact: 'x@x.com', answers: {} })).status, 400);
  await pub('POST', `/fichaje/api/v/${v.slug}/apply`, { name: 'Tercera Persona', contact: 'tercera@x.com', answers: answersFor(questions, true) });

  assert.equal((await pub('GET', `/fichaje/api/v/${v.slug}/panel`, null, { 'x-fichaje-key': 'mala' })).status, 403);
  const key = v.panel_url.split('#k=')[1];
  const panel = (await pub('GET', `/fichaje/api/v/${v.slug}/panel`, null, { 'x-fichaje-key': key })).body;
  assert.equal(panel.stats.total, 3);
  assert.equal(panel.stats.locked, 1, 'plan gratis muestra solo FICHAJE_FREE_CANDIDATES');
  const lucia = panel.candidates.find((c) => c.name === 'Lucía Martínez');
  const diego = panel.candidates.find((c) => c.name === 'Diego Sosa');
  assert.ok(lucia.score >= 75, `score ${lucia.score}`); assert.equal(lucia.verdict, 'Fichar ya');
  assert.ok(diego.score <= 30); assert.equal(diego.verdict, 'Descartado');
  const locked = panel.candidates.find((c) => c.locked);
  assert.equal(locked.contact, '•••••••'); assert.equal(locked.answers, undefined);
  assert.match(panel.offer.pay_url, /^https:\/\/wa\.me\/5491155550000\?text=/);
  assert.equal((await app.inject({ url: `/fichaje/api/v/${v.slug}/export.csv?k=${key}` })).statusCode, 402);
});

test('El dueño ve la caja y desbloquea; luego se ve todo y se exporta', async () => {
  assert.equal((await pub('GET', '/fichaje/api/admin/overview')).status, 401);
  const o = await call('GET', '/fichaje/api/admin/overview');
  assert.equal(o.status, 200);
  assert.equal(o.body.totals.ready_to_upsell, 1);
  const id = o.body.vacancies[0].id;
  assert.equal((await call('POST', `/fichaje/api/admin/vacancies/${id}/plan`, { plan: 'fichaje' })).status, 200);
  const key = v.panel_url.split('#k=')[1];
  const panel = (await pub('GET', `/fichaje/api/v/${v.slug}/panel`, null, { 'x-fichaje-key': key })).body;
  assert.equal(panel.stats.locked, 0);
  const csv = await app.inject({ url: `/fichaje/api/v/${v.slug}/export.csv?k=${key}` });
  assert.equal(csv.statusCode, 200);
  assert.match(csv.body, /Lucía Martínez/);
  const ev = t.db.q.all(`SELECT type FROM events WHERE type LIKE 'fichaje.%'`).map((e) => e.type);
  assert.ok(ev.includes('fichaje.vacancy') && ev.includes('fichaje.hot') && ev.includes('fichaje.paid'));
});

test('Cerrar búsqueda bloquea nuevas postulaciones', async () => {
  const key = v.panel_url.split('#k=')[1];
  assert.equal((await pub('POST', `/fichaje/api/v/${v.slug}/close`, {}, { 'x-fichaje-key': key })).body.closed, true);
  const { questions } = (await pub('GET', `/fichaje/api/v/${v.slug}`)).body;
  assert.equal((await pub('POST', `/fichaje/api/v/${v.slug}/apply`, { name: 'Tarde', contact: 'tarde@x.com', answers: answersFor(questions, true) })).status, 410);
});

test('Con Claude (SIMULADO) el kit y el puntaje vienen del modelo, con tope por excluyente', async () => {
  const { setLlmProvider } = await import('../server/llm/anthropic.js');
  setLlmProvider(async (req) => {
    const isKit = req.system.includes('copywriter');
    const text = isKit ? JSON.stringify({
      headline: 'Muebles Norte ficha vendedor', aviso: 'Aviso de prueba', reel: [{ t: '0–3 s', screen: 'x', voice: 'y' }],
      posts: { linkedin: 'a', instagram: 'b', whatsapp: 'c' },
      questions: [{ id: 'k1', type: 'knockout', text: '¿Vendiste antes?', expect: 'si', weight: 3 }, { id: 'o1', type: 'open', text: 'Logro', weight: 3 }, { id: 'd', type: 'choice', text: 'Inicio', options: ['Ya', 'Luego'], weight: 1 }],
      rubric: ['a', 'b', 'c', 'd'],
    }) : JSON.stringify({ score: 88, reasons: ['Evidencia concreta'], red_flags: [] });
    return { content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 100, web_searches: 0 } };
  });
  const r = await pub('POST', '/fichaje/api/vacancies', { ...vacancy, title: 'Vendedor 2' });
  assert.equal(r.body.kit_source, 'claude');
  await pub('POST', `/fichaje/api/v/${r.body.slug}/apply`, { name: 'Ana', contact: 'ana@x.com', answers: { k1: 'Sí', o1: 'Vendí 50 juegos de living', d: 'Ya' } });
  await pub('POST', `/fichaje/api/v/${r.body.slug}/apply`, { name: 'Beto', contact: 'beto@x.com', answers: { k1: 'No', o1: 'Vendí 50 juegos de living', d: 'Ya' } });
  const key = r.body.panel_url.split('#k=')[1];
  const c = (await pub('GET', `/fichaje/api/v/${r.body.slug}/panel`, null, { 'x-fichaje-key': key })).body.candidates;
  assert.equal(c.find((x) => x.name === 'Ana').score, 88);
  assert.equal(c.find((x) => x.name === 'Beto').score, 30);
  assert.ok(t.db.q.get('SELECT COUNT(*) n FROM spend_ledger').n >= 3, 'el gasto queda registrado');
  setLlmProvider(null);
});
