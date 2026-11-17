// Fichaje · rutas públicas (empresas y candidatos) y del dueño (desde la sesión de Demian OS).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { q, j } from '../db.js';
import { config } from '../config.js';
import { randomId, sha256 } from '../lib/util.js';
import { emit } from '../lib/events.js';
import { generateKit, scoreCandidate } from './engine.js';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const ASSETS = { 'fichaje.css': 'text/css; charset=utf-8', 'fichaje.js': 'text/javascript; charset=utf-8', 'icon.svg': 'image/svg+xml' };
const env = (k, d) => (process.env[k] ? String(process.env[k]).trim() : d);

export const offer = () => ({
  free_candidates: Number(env('FICHAJE_FREE_CANDIDATES', 5)),
  price: env('FICHAJE_PRICE', 'US$ 29'),
  pro_price: env('FICHAJE_PRO_PRICE', 'US$ 149'),
  whatsapp: env('FICHAJE_WHATSAPP', '').replace(/[^\d]/g, ''),
  brand: env('FICHAJE_BRAND', 'Elite Hunters HR'),
});

function payLink(kind, v) {
  const o = offer();
  const url = env(kind === 'pro' ? 'FICHAJE_PRO_PAY_URL' : 'FICHAJE_PAY_URL', '');
  if (url) return url.replace('{slug}', encodeURIComponent(v.slug));
  if (o.whatsapp) {
    const msg = kind === 'pro'
      ? `Hola! Quiero Fichaje Pro (${o.pro_price}) para la vacante "${v.title}" (código ${v.slug}).`
      : `Hola! Quiero desbloquear la vacante "${v.title}" en Fichaje (${o.price}). Código: ${v.slug}`;
    return `https://wa.me/${o.whatsapp}?text=${encodeURIComponent(msg)}`;
  }
  return null;
}

// Límite simple por IP (memoria del proceso): frena abuso del formulario público.
const hits = new Map();
function rateLimit(req, bucket, max, windowMs) {
  const key = `${bucket}:${req.ip}`; const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw Object.assign(new Error('Demasiados intentos. Probá de nuevo en un rato.'), { statusCode: 429 });
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
}

const str = (v, max, required = false, label = 'campo') => {
  const s = String(v ?? '').trim();
  if (required && !s) throw Object.assign(new Error(`Falta ${label}`), { statusCode: 400 });
  if (s.length > max) throw Object.assign(new Error(`${label} es demasiado largo`), { statusCode: 400 });
  return s;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ipHash = (req) => sha256(`${req.ip}|${config.sessionSecret || ''}`).slice(0, 16);

function loadVacancy(slug) {
  const v = q.get('SELECT * FROM fichaje_vacancies WHERE slug = ?', String(slug || ''));
  if (!v) throw Object.assign(new Error('Vacante no encontrada'), { statusCode: 404 });
  return v;
}
function loadOwned(slug, key) {
  const v = loadVacancy(slug);
  const a = Buffer.from(v.admin_key); const b = Buffer.from(String(key || ''));
  if (a.length !== b.length || !a.equals(b)) throw Object.assign(new Error('Link de panel inválido'), { statusCode: 403 });
  return v;
}
const page = (file, vars = {}) => {
  let html = fs.readFileSync(path.join(PUB, file), 'utf8');
  for (const [k, val] of Object.entries(vars)) html = html.replaceAll(`{{${k}}}`, esc(val));
  return html;
};
const requireStaff = (req) => {
  if (!req.user || !['owner', 'admin'].includes(req.user.role)) throw Object.assign(new Error('Iniciá sesión en Demian OS'), { statusCode: 401 });
  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'demian-os') throw Object.assign(new Error('Solicitud rechazada (CSRF)'), { statusCode: 403 });
};
const requireJsonClient = (req) => {
  if (req.headers['x-requested-with'] !== 'fichaje') throw Object.assign(new Error('Solicitud rechazada'), { statusCode: 403 });
};

// Con FICHAJE_DOMAIN (p. ej. fichaje.lat), la raíz de ese dominio muestra la landing de Fichaje.
export function fichajeRewrite(req) {
  const dom = env('FICHAJE_DOMAIN', '').toLowerCase();
  const host = String(req.headers.host || '').toLowerCase().split(':')[0];
  if (dom && host === dom && (req.url === '/' || req.url.startsWith('/?'))) return '/fichaje' + req.url.slice(1);
  return req.url;
}

function candidateView(c, locked) {
  const base = { id: c.id, score: c.score, verdict: c.verdict, created_at: c.created_at, locked };
  if (locked) return { ...base, name: c.name.split(/\s+/)[0].slice(0, 1) + '•••••', contact: '•••••••' };
  return { ...base, name: c.name, contact: c.contact, answers: j.parse(c.answers, {}), reasons: j.parse(c.reasons, []), red_flags: j.parse(c.red_flags, []), score_source: c.score_source };
}

export default async function fichajeRoutes(app) {
  // ---------- Páginas ----------
  const html = (reply, body) => reply.type('text/html; charset=utf-8').send(body);
  app.get('/fichaje', async (req, reply) => html(reply, page('landing.html', { price: offer().price, pro_price: offer().pro_price, brand: offer().brand })));
  app.get('/fichaje/admin', async (req, reply) => html(reply, page('admin.html')));
  app.get('/fichaje/assets/:file', async (req, reply) => {
    const type = ASSETS[req.params.file];
    if (!type) return reply.status(404).send({ error: 'No encontrado' });
    return reply.type(type).header('cache-control', 'public, max-age=300').send(fs.readFileSync(path.join(PUB, req.params.file)));
  });
  app.get('/v/:slug', async (req, reply) => {
    const v = loadVacancy(req.params.slug);
    const kit = j.parse(v.kit, {});
    q.run('UPDATE fichaje_vacancies SET views = views + 1 WHERE id = ?', v.id);
    return html(reply, page('apply.html', { title: kit.headline || `${v.company_name} busca ${v.title}`, desc: 'Postulate en 3 minutos, sin CV. Respondés unas preguntas y te contestan rápido.', url: `${config.publicUrl}/v/${v.slug}` }));
  });
  app.get('/v/:slug/panel', async (req, reply) => { loadVacancy(req.params.slug); return html(reply, page('panel.html')); });

  // ---------- API pública ----------
  app.post('/fichaje/api/vacancies', async (req) => {
    requireJsonClient(req);
    rateLimit(req, 'vac', Number(env('FICHAJE_RATE_VACANCIES', 6)), 3600_000);
    const b = req.body || {};
    if (b.website) throw Object.assign(new Error('Solicitud rechazada'), { statusCode: 400 }); // trampa anti-bots
    const v = {
      title: str(b.title, 120, true, 'el puesto'),
      company_name: str(b.company_name, 120, true, 'la empresa'),
      location: str(b.location, 120),
      salary: str(b.salary, 120),
      description: str(b.description, 6000, true, 'la descripción'),
      must_haves: str(b.must_haves, 1500),
      contact_email: str(b.contact_email, 200),
      contact_whatsapp: str(b.contact_whatsapp, 40),
    };
    if (v.description.length < 40) throw Object.assign(new Error('Contanos un poco más del puesto (mínimo 40 caracteres)'), { statusCode: 400 });
    if (!v.contact_email && !v.contact_whatsapp) throw Object.assign(new Error('Dejá un email o WhatsApp para avisarte de los candidatos'), { statusCode: 400 });
    const { kit, source } = await generateKit(v);
    const slug = randomId(6).replace(/[-_]/g, 'x');
    const admin_key = randomId(18);
    const r = q.run(`INSERT INTO fichaje_vacancies(slug, admin_key, title, company_name, location, salary, description, must_haves, contact_email, contact_whatsapp, kit, kit_source, ip_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, slug, admin_key, v.title, v.company_name, v.location, v.salary, v.description, v.must_haves, v.contact_email, v.contact_whatsapp, j.str(kit), source, ipHash(req));
    emit('fichaje.vacancy', `Fichaje: nueva vacante “${v.title}” de ${v.company_name} (${v.contact_whatsapp || v.contact_email})`, { notify: true, data: { vacancy_id: Number(r.lastInsertRowid), slug } });
    return { slug, admin_key, apply_url: `${config.publicUrl}/v/${slug}`, panel_url: `${config.publicUrl}/v/${slug}/panel#k=${admin_key}`, kit_source: source };
  });

  app.get('/fichaje/api/v/:slug', async (req) => {
    const v = loadVacancy(req.params.slug);
    const kit = j.parse(v.kit, {});
    return {
      title: v.title, company_name: v.company_name, location: v.location, salary: v.salary, closed: !!v.closed_at,
      headline: kit.headline, aviso: kit.aviso,
      questions: (kit.questions || []).map(({ id, type, text, options }) => ({ id, type, text, ...(type === 'choice' ? { options } : {}) })),
    };
  });

  app.post('/fichaje/api/v/:slug/apply', async (req) => {
    requireJsonClient(req);
    rateLimit(req, 'apply', Number(env('FICHAJE_RATE_APPLY', 20)), 3600_000);
    const v = loadVacancy(req.params.slug);
    if (v.closed_at) throw Object.assign(new Error('Esta búsqueda ya cerró'), { statusCode: 410 });
    const b = req.body || {};
    if (b.website) throw Object.assign(new Error('Solicitud rechazada'), { statusCode: 400 });
    const name = str(b.name, 120, true, 'tu nombre');
    const contact = str(b.contact, 160, true, 'un contacto');
    const kit = j.parse(v.kit, {});
    const answers = {};
    for (const qq of kit.questions || []) {
      const a = str(b.answers?.[qq.id], 2000);
      if (!a) throw Object.assign(new Error(`Falta responder: ${qq.text}`), { statusCode: 400 });
      answers[qq.id] = a;
    }
    const dupe = q.get('SELECT id FROM fichaje_candidates WHERE vacancy_id = ? AND lower(contact) = lower(?)', v.id, contact);
    if (dupe) throw Object.assign(new Error('Ya recibimos tu postulación para esta vacante'), { statusCode: 409 });
    const s = await scoreCandidate(v, kit, answers);
    q.run(`INSERT INTO fichaje_candidates(vacancy_id, name, contact, answers, score, verdict, reasons, red_flags, score_source, ip_hash) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      v.id, name, contact, j.str(answers), s.score, s.verdict, j.str(s.reasons), j.str(s.red_flags), s.source, ipHash(req));
    const count = q.get('SELECT COUNT(*) c FROM fichaje_candidates WHERE vacancy_id = ?', v.id).c;
    if (s.verdict === 'Fichar ya' || (v.plan === 'free' && count === offer().free_candidates + 1))
      emit('fichaje.hot', `Fichaje: “${v.title}” (${v.company_name}) tiene ${count} candidatos${s.verdict === 'Fichar ya' ? ' — llegó uno para fichar ya' : ''}. ${v.plan === 'free' ? 'Momento de ofrecer el desbloqueo.' : ''}`,
        { notify: true, data: { vacancy_id: v.id, plan: v.plan, contact: v.contact_whatsapp || v.contact_email } });
    return { ok: true };
  });

  app.get('/fichaje/api/v/:slug/panel', async (req) => {
    const v = loadOwned(req.params.slug, req.headers['x-fichaje-key']);
    const o = offer();
    const all = q.all('SELECT * FROM fichaje_candidates WHERE vacancy_id = ? ORDER BY id ASC', v.id);
    const paid = v.plan !== 'free';
    const visible = new Set((paid ? all : all.slice(0, o.free_candidates)).map((c) => c.id));
    const candidates = all.map((c) => candidateView(c, !visible.has(c.id))).sort((a, b) => b.score - a.score);
    return {
      vacancy: { slug: v.slug, title: v.title, company_name: v.company_name, location: v.location, salary: v.salary, plan: v.plan, closed: !!v.closed_at, views: v.views, created_at: v.created_at, kit_source: v.kit_source },
      kit: j.parse(v.kit, {}),
      apply_url: `${config.publicUrl}/v/${v.slug}`,
      candidates,
      stats: { total: all.length, locked: candidates.filter((c) => c.locked).length, hot_locked: candidates.filter((c) => c.locked && c.verdict === 'Fichar ya').length },
      offer: { ...o, whatsapp: undefined, pay_url: payLink('fichaje', v), pro_pay_url: payLink('pro', v) },
    };
  });

  app.get('/fichaje/api/v/:slug/export.csv', async (req, reply) => {
    const v = loadOwned(req.params.slug, req.query.k);
    if (v.plan === 'free') throw Object.assign(new Error('La exportación se habilita al desbloquear la vacante'), { statusCode: 402 });
    const kit = j.parse(v.kit, {});
    const cell = (x) => `"${String(x ?? '').replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;
    const head = ['Puntaje', 'Veredicto', 'Nombre', 'Contacto', 'Fecha', ...(kit.questions || []).map((x) => x.text)];
    const rows = q.all('SELECT * FROM fichaje_candidates WHERE vacancy_id = ? ORDER BY score DESC', v.id)
      .map((c) => { const a = j.parse(c.answers, {}); return [c.score, c.verdict, c.name, c.contact, c.created_at, ...(kit.questions || []).map((x) => a[x.id])]; });
    return reply.type('text/csv; charset=utf-8').header('content-disposition', `attachment; filename="fichaje-${v.slug}.csv"`)
      .send('﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\n'));
  });

  app.post('/fichaje/api/v/:slug/close', async (req) => {
    requireJsonClient(req);
    const v = loadOwned(req.params.slug, req.headers['x-fichaje-key']);
    q.run(`UPDATE fichaje_vacancies SET closed_at = CASE WHEN closed_at IS NULL THEN datetime('now') ELSE NULL END WHERE id = ?`, v.id);
    return { closed: !v.closed_at };
  });

  // ---------- Dueño (sesión de Demian OS) ----------
  app.get('/fichaje/api/admin/overview', async (req) => {
    requireStaff(req);
    const vacancies = q.all(`SELECT v.id, v.slug, v.title, v.company_name, v.contact_email, v.contact_whatsapp, v.plan, v.paid_at, v.views, v.created_at, v.kit_source, v.closed_at,
        (SELECT COUNT(*) FROM fichaje_candidates c WHERE c.vacancy_id = v.id) candidates,
        (SELECT COUNT(*) FROM fichaje_candidates c WHERE c.vacancy_id = v.id AND c.verdict = 'Fichar ya') hot
      FROM fichaje_vacancies v ORDER BY v.id DESC LIMIT 300`);
    const o = offer();
    return {
      vacancies,
      totals: {
        vacancies: vacancies.length,
        candidates: vacancies.reduce((s, x) => s + x.candidates, 0),
        paid: vacancies.filter((x) => x.plan === 'fichaje').length,
        pro: vacancies.filter((x) => x.plan === 'pro').length,
        ready_to_upsell: vacancies.filter((x) => x.plan === 'free' && x.candidates > o.free_candidates).length,
      },
      offer: { price: o.price, pro_price: o.pro_price, pay_url_configured: !!env('FICHAJE_PAY_URL', ''), whatsapp_configured: !!o.whatsapp },
    };
  });

  app.post('/fichaje/api/admin/vacancies/:id/plan', async (req) => {
    requireStaff(req);
    const plan = String(req.body?.plan || '');
    if (!['free', 'fichaje', 'pro'].includes(plan)) throw Object.assign(new Error('Plan inválido'), { statusCode: 400 });
    const r = q.run(`UPDATE fichaje_vacancies SET plan = ?, paid_at = CASE WHEN ? = 'free' THEN NULL ELSE COALESCE(paid_at, datetime('now')) END WHERE id = ?`, plan, plan, Number(req.params.id));
    if (!r.changes) throw Object.assign(new Error('Vacante no encontrada'), { statusCode: 404 });
    emit('fichaje.paid', `Fichaje: vacante #${req.params.id} pasó a plan ${plan}`, { data: { vacancy_id: Number(req.params.id), plan } });
    return { ok: true, plan };
  });

  app.get('/fichaje/api/admin/vacancies/:id/panel-link', async (req) => {
    requireStaff(req);
    const v = q.get('SELECT slug, admin_key FROM fichaje_vacancies WHERE id = ?', Number(req.params.id));
    if (!v) throw Object.assign(new Error('Vacante no encontrada'), { statusCode: 404 });
    return { panel_url: `${config.publicUrl}/v/${v.slug}/panel#k=${v.admin_key}` };
  });
}
