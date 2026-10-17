import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import crypto from 'node:crypto';
import { q, j, nowIso } from '../db.js';
import { config } from '../config.js';
import { login, logout, createUser, publicUser, allowedCompanyIds, assertCompanyAccess, assertCanAct } from '../lib/auth.js';
import { emit, eventsSince, bus } from '../lib/events.js';
import { enqueue, queueStats } from '../lib/queue.js';
import { getSetting, setSetting, audit, shortCode, PermissionError } from '../lib/util.js';
import { periodSpend, limits } from '../lib/spend.js';
import { DEPARTMENTS, getAgent, TOOLS } from '../agents/roster.js';
import { submitInstruction } from '../agents/director.js';
import { createTask, scheduleIfReady, getTask, cancelTask, retryTask, hydrate } from '../agents/tasks.js';
import { decide, ACTION_LABEL } from '../agents/approvals.js';
import { integrationStatuses, testIntegration, INTEGRATIONS } from '../integrations/registry.js';
import { authUrl, handleCallback, googleConfigured, google } from '../integrations/google.js';
import { pauseConversation, resumeConversation } from '../channels/chatwoot-handler.js';
import { llmMode } from '../llm/anthropic.js';
import { listSecrets, setSecret, webhookUrl } from '../lib/secrets.js';
import { hashPassword, verifyPassword } from '../lib/auth.js';

const AGENT_TOOL_INTEGRATION = { web_search: 'claude', calendar_read: 'google_calendar', drive_read: 'google_drive', render_reel: 'video', qa_video: 'video', conversations_read: 'chatwoot' };
const num = (v) => (v === undefined || v === null || v === '' || v === 'null' ? null : Number(v));

function scopeFilter(user, alias = '') {
  const ids = allowedCompanyIds(user);
  const a = alias ? `${alias}.` : '';
  return { sql: `(${a}company_id IS NULL OR ${a}company_id IN (${ids.map(() => '?').join(',') || 'NULL'}))`, params: ids };
}

export function agentStatus(slug) {
  const running = q.get(`SELECT id, title, started_at FROM tasks WHERE agent_slug = ? AND status = 'running' ORDER BY id DESC LIMIT 1`, slug);
  if (running) return { status: 'working', task: running };
  const waiting = q.get(`SELECT id, title FROM tasks WHERE agent_slug = ? AND status = 'waiting_approval' ORDER BY id DESC LIMIT 1`, slug);
  if (waiting) return { status: 'waiting_approval', task: waiting };
  const queued = q.get(`SELECT id, title FROM tasks WHERE agent_slug = ? AND status = 'queued' ORDER BY id LIMIT 1`, slug);
  const last = q.get(`SELECT id, title, status, status_reason, finished_at FROM tasks WHERE agent_slug = ? AND status IN ('completed','failed','blocked') ORDER BY finished_at DESC LIMIT 1`, slug);
  const recent = last && last.finished_at && Date.parse(last.finished_at) > Date.now() - 6 * 3600_000;
  if (recent && last.status === 'failed') return { status: 'failed', task: last };
  if (recent && last.status === 'blocked') return { status: 'blocked', task: last };
  if (queued) return { status: 'queued', task: queued };
  if (last && last.status === 'completed' && Date.parse(last.finished_at) > Date.now() - 15 * 60_000) return { status: 'completed', task: last };
  return { status: 'available', task: null };
}

// En Render sin disco, los datos viven en el sistema de archivos efímero del contenedor.
function isEphemeral() {
  if (!process.env.RENDER) return false;
  try { return fs.statSync(config.dataDir).dev === fs.statSync('/').dev; } catch { return true; }
}

export default async function api(app) {
  // ---------- Autenticación ----------
  app.addHook('preHandler', async (req) => {
    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'demian-os')
      throw Object.assign(new Error('Solicitud rechazada (CSRF)'), { statusCode: 403 });
    if (req.routeOptions.config?.public) return;
    if (!req.user) throw Object.assign(new Error('Iniciá sesión'), { statusCode: 401 });
  });

  app.post('/auth/login', { config: { public: true } }, async (req, reply) => {
    const { email, password } = req.body || {};
    const r = login(email, password, { ip: req.ip, userAgent: req.headers['user-agent'] });
    reply.setCookie('dos_sid', r.sessionId, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/', maxAge: 30 * 86400 });
    audit(r.user.id, 'app', 'login', null, { ip: req.ip });
    return { user: r.user };
  });
  // Primer arranque sin usuarios: alta del dueño con el código de instalación (logs del servidor o SETUP_CODE).
  app.get('/setup/status', { config: { public: true } }, async () => {
    const needs = q.get('SELECT COUNT(*) c FROM users').c === 0;
    return needs ? { needs_setup: true, admin_env: { email: !!config.bootstrapAdmin.email, password: !!config.bootstrapAdmin.password } } : { needs_setup: false };
  });
  app.post('/setup', { config: { public: true } }, async (req, reply) => {
    if (q.get('SELECT COUNT(*) c FROM users').c > 0) throw Object.assign(new Error('La instalación ya tiene dueño'), { statusCode: 409 });
    const { code, email, name, password } = req.body || {};
    const expected = Buffer.from(String(config.setupCode || ''));
    const got = Buffer.from(String(code || '').trim().toUpperCase());
    if (!expected.length || expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) throw Object.assign(new Error('Código de instalación incorrecto'), { statusCode: 401 });
    const u = createUser({ email, name: name || 'Demian', password, role: 'owner' });
    audit(u.id, 'app', 'setup.owner', `user:${u.id}`);
    const r = login(email, password, { ip: req.ip, userAgent: req.headers['user-agent'] });
    reply.setCookie('dos_sid', r.sessionId, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/', maxAge: 30 * 86400 });
    return { user: r.user };
  });

  app.post('/auth/logout', async (req, reply) => { logout(req.cookies.dos_sid); reply.clearCookie('dos_sid', { path: '/' }); return { ok: true }; });

  app.get('/me', async (req) => ({
    user: publicUser(req.user), demo: config.demo, llm: llmMode(),
    companies: q.all(`SELECT id, slug, name, description, color FROM companies WHERE id IN (${allowedCompanyIds(req.user).join(',') || 'NULL'}) ORDER BY id`),
    paused: !!getSetting('automations_paused'),
    ephemeral: isEphemeral(),
  }));

  app.post('/me/password', async (req) => {
    const { current, next } = req.body || {};
    if (!verifyPassword(current, req.user.password_hash)) throw Object.assign(new Error('La contraseña actual no coincide'), { statusCode: 400 });
    q.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(next), req.user.id);
    q.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', req.user.id, req.cookies.dos_sid);
    audit(req.user.id, 'app', 'password.change', `user:${req.user.id}`);
    return { ok: true };
  });

  // ---------- Credenciales de integraciones (solo dueño; nunca se devuelven los valores) ----------
  const ownerOnly = (u) => { if (u.role !== 'owner') throw new PermissionError('Solo el dueño gestiona credenciales'); };
  app.get('/secrets', async (req) => { ownerOnly(req.user); return { items: listSecrets(), webhook_url: webhookUrl(), google_redirect: config.google.redirectUri, public_url: config.publicUrl }; });
  app.put('/secrets/:key', async (req) => {
    ownerOnly(req.user);
    const r = setSecret(req.params.key, req.body?.value);
    audit(req.user.id, 'app', 'secret.set', req.params.key, { cleared: !r.source });
    emit('settings.secret', `Credencial ${r.source ? 'actualizada' : 'eliminada'}: ${r.label}`, { agent_slug: 'monitor' });
    return { item: r, webhook_url: webhookUrl() };
  });

  app.post('/me/whatsapp', async (req) => {
    assertCanAct(req.user);
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (phone.length < 10) throw Object.assign(new Error('Número inválido (incluí código de país, ej. 5491122334455)'), { statusCode: 400 });
    const code = shortCode();
    q.run('UPDATE users SET whatsapp_phone = ?, whatsapp_verified_at = NULL, whatsapp_verify_code = ? WHERE id = ?', phone, code, req.user.id);
    audit(req.user.id, 'app', 'whatsapp.set', `user:${req.user.id}`, { phone });
    return { phone, code, instructions: `Desde ese WhatsApp, escribí al número conectado a Chatwoot: VERIFICAR ${code}` };
  });

  // ---------- Oficina ----------
  app.get('/office', async (req) => {
    const agents = q.all('SELECT slug, name, department, role, mode, avatar, desk, tools FROM agents WHERE enabled = 1 ORDER BY department, desk').map((a) => {
      const st = agentStatus(a.slug);
      return { ...a, avatar: j.parse(a.avatar, {}), tools: j.parse(a.tools, []), status: st.status, task: st.task };
    });
    const s = scopeFilter(req.user);
    const counts = Object.fromEntries(q.all(`SELECT status, COUNT(*) c FROM tasks WHERE ${s.sql} GROUP BY status`, ...s.params).map((r) => [r.status, r.c]));
    return {
      departments: DEPARTMENTS, agents, counts, paused: !!getSetting('automations_paused'), demo: config.demo,
      pending_approvals: q.get(`SELECT COUNT(*) c FROM approvals WHERE status = 'pending' AND ${s.sql}`, ...s.params).c,
      unread: q.get(`SELECT COUNT(*) c FROM events WHERE notify = 1 AND read_at IS NULL AND ${s.sql}`, ...s.params).c,
      spend: { ...periodSpend(), limits: limits() }, queue: queueStats(), llm: llmMode(),
      integrations: integrationStatuses().map((i) => ({ key: i.key, name: i.name, status: i.status })),
      last_event_id: q.get('SELECT COALESCE(MAX(id),0) m FROM events').m,
    };
  });

  app.get('/events/stream', async (req, reply) => {
    const allowed = new Set(allowedCompanyIds(req.user));
    const visible = (ev) => ev.company_id === null || allowed.has(ev.company_id);
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    let last = Number(req.headers['last-event-id'] || req.query.since || 0);
    for (const ev of eventsSince(last, 500)) if (visible(ev)) { res.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`); last = ev.id; }
    const onEv = (ev) => { if (visible(ev)) res.write(`id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`); };
    bus.on('event', onEv);
    const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
    req.raw.on('close', () => { clearInterval(ping); bus.off('event', onEv); });
  });

  app.get('/events', async (req) => {
    const s = scopeFilter(req.user);
    const where = [s.sql];
    const params = [...s.params];
    if (req.query.notify) where.push('notify = 1');
    if (req.query.agent) { where.push('agent_slug = ?'); params.push(req.query.agent); }
    if (req.query.before) { where.push('id < ?'); params.push(Number(req.query.before)); }
    return q.all(`SELECT * FROM events WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ?`, ...params, Math.min(200, Number(req.query.limit) || 60));
  });
  app.post('/notifications/read', async (req) => { q.run(`UPDATE events SET read_at = ? WHERE notify = 1 AND read_at IS NULL`, nowIso()); return { ok: true }; });

  // ---------- Agentes ----------
  app.get('/agents/:slug', async (req) => {
    const a = getAgent(req.params.slug);
    if (!a) throw Object.assign(new Error('Agente inexistente'), { statusCode: 404 });
    const s = scopeFilter(req.user);
    const ints = Object.fromEntries(integrationStatuses().map((i) => [i.key, i]));
    return {
      ...a, department_name: DEPARTMENTS.find((d) => d.key === a.department)?.name, ...agentStatus(a.slug),
      tools: a.tools.map((t) => ({ key: t, description: TOOLS[t], integration: AGENT_TOOL_INTEGRATION[t] ? { key: AGENT_TOOL_INTEGRATION[t], status: ints[AGENT_TOOL_INTEGRATION[t]]?.status } : null })),
      approvals_allowed: (a.permissions.approvals || []).map((x) => ACTION_LABEL[x]),
      history: q.all(`SELECT id, ts, type, level, message, task_id FROM events WHERE agent_slug = ? AND ${s.sql} ORDER BY id DESC LIMIT 40`, a.slug, ...s.params),
      tasks: q.all(`SELECT id, title, status, status_reason, result_summary, cost_usd, created_at, finished_at FROM tasks WHERE agent_slug = ? AND ${s.sql} ORDER BY id DESC LIMIT 20`, a.slug, ...s.params),
      deliverables: q.all(`SELECT id, kind, title, created_at FROM deliverables WHERE agent_slug = ? AND ${s.sql} ORDER BY id DESC LIMIT 12`, a.slug, ...s.params),
      errors: q.all(`SELECT r.id, r.task_id, r.error, r.finished_at FROM runs r JOIN tasks t ON t.id = r.task_id WHERE t.agent_slug = ? AND r.error IS NOT NULL AND ${s.sql.replace(/company_id/g, 't.company_id')} ORDER BY r.id DESC LIMIT 10`, a.slug, ...s.params),
    };
  });

  app.post('/agents/:slug/task', async (req) => {
    assertCanAct(req.user);
    const a = getAgent(req.params.slug);
    if (!a) throw Object.assign(new Error('Agente inexistente'), { statusCode: 404 });
    const { text, company_id, client_id, params = {} } = req.body || {};
    if (!text?.trim()) throw Object.assign(new Error('Escribí la tarea'), { statusCode: 400 });
    assertCompanyAccess(req.user, num(company_id));
    if (num(client_id)) { const c = q.get('SELECT company_id FROM clients WHERE id = ?', num(client_id)); if (!c || c.company_id !== num(company_id)) throw Object.assign(new Error('Cliente fuera de la empresa'), { statusCode: 400 }); }
    const t = createTask({ agent_slug: a.slug, company_id: num(company_id), client_id: num(client_id), title: text.slice(0, 90), input: text, params, created_by: req.user.id, is_demo: config.demo });
    scheduleIfReady(t);
    return getTask(t.id);
  });

  // ---------- Instrucciones al director ----------
  app.post('/instructions', async (req) => {
    assertCanAct(req.user);
    const { text, company_id, client_id, attachments = [], params = {} } = req.body || {};
    const inst = submitInstruction({ text, companyId: num(company_id), clientId: num(client_id), user: req.user, attachments, params, allowedIds: allowedCompanyIds(req.user), isDemo: config.demo });
    enqueue('director.plan', { instructionId: inst.id }, { idempotencyKey: `plan:${inst.id}`, automation: false });
    return inst;
  });
  app.get('/instructions', async (req) => {
    const s = scopeFilter(req.user);
    return q.all(`SELECT * FROM instructions WHERE ${s.sql} ORDER BY id DESC LIMIT ?`, ...s.params, Math.min(100, Number(req.query.limit) || 30))
      .map((i) => ({ ...i, plan: j.parse(i.plan, {}), tasks: q.all('SELECT id, title, agent_slug, status FROM tasks WHERE instruction_id = ? ORDER BY id', i.id) }));
  });
  app.get('/instructions/:id', async (req) => {
    const i = q.get('SELECT * FROM instructions WHERE id = ?', Number(req.params.id));
    if (!i) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, i.company_id);
    return { ...i, plan: j.parse(i.plan, {}), attachments: j.parse(i.attachments, []),
      tasks: q.all('SELECT * FROM tasks WHERE instruction_id = ? ORDER BY id', i.id).map(hydrate),
      deliverables: q.all('SELECT id, task_id, kind, title, body, meta, created_at FROM deliverables WHERE instruction_id = ? ORDER BY id', i.id).map((d) => ({ ...d, meta: j.parse(d.meta, {}) })),
      approvals: q.all(`SELECT * FROM approvals WHERE task_id IN (SELECT id FROM tasks WHERE instruction_id = ?) ORDER BY id`, i.id).map((a) => ({ ...a, payload: j.parse(a.payload) })) };
  });

  // ---------- Tareas ----------
  app.get('/tasks', async (req) => {
    const s = scopeFilter(req.user);
    const where = [s.sql];
    const params = [...s.params];
    for (const [k, col] of [['status', 'status'], ['agent', 'agent_slug'], ['company_id', 'company_id'], ['client_id', 'client_id']])
      if (req.query[k]) { where.push(`${col} = ?`); params.push(['company_id', 'client_id'].includes(k) ? Number(req.query[k]) : req.query[k]); }
    if (req.query.q) { where.push('(title LIKE ? OR input LIKE ? OR result_summary LIKE ?)'); params.push(...Array(3).fill(`%${req.query.q}%`)); }
    return q.all(`SELECT id, instruction_id, company_id, client_id, agent_slug, kind, title, status, status_reason, result_summary, cost_usd, cost_estimate_usd, created_at, started_at, finished_at, due_at, is_demo
      FROM tasks WHERE ${where.join(' AND ')} AND kind != 'skill:plan' ORDER BY id DESC LIMIT ?`, ...params, Math.min(200, Number(req.query.limit) || 80));
  });
  app.get('/tasks/:id', async (req) => {
    const t = getTask(Number(req.params.id));
    if (!t) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, t.company_id);
    return { ...t,
      agent: getAgent(t.agent_slug),
      runs: q.all('SELECT * FROM runs WHERE task_id = ? ORDER BY id', t.id).map((r) => ({ ...r, steps: j.parse(r.steps, []) })),
      deliverables: q.all('SELECT id, kind, title, body, meta, mime, size, sha256, created_at FROM deliverables WHERE task_id = ?', t.id).map((d) => ({ ...d, meta: j.parse(d.meta, {}) })),
      approvals: q.all('SELECT * FROM approvals WHERE task_id = ?', t.id).map((a) => ({ ...a, payload: j.parse(a.payload) })),
      dependencies: t.depends_on.map((id) => q.get('SELECT id, title, status, agent_slug FROM tasks WHERE id = ?', id)).filter(Boolean),
      company: t.company_id ? q.get('SELECT name, slug FROM companies WHERE id = ?', t.company_id) : null,
      client: t.client_id ? q.get('SELECT id, name FROM clients WHERE id = ?', t.client_id) : null };
  });
  app.post('/tasks/:id/cancel', async (req) => { assertCanAct(req.user); const t = getTask(Number(req.params.id)); assertCompanyAccess(req.user, t?.company_id); audit(req.user.id, 'app', 'task.cancel', `task:${t.id}`); return cancelTask(t.id, req.user.id); });
  app.post('/tasks/:id/retry', async (req) => { assertCanAct(req.user); const t = getTask(Number(req.params.id)); assertCompanyAccess(req.user, t?.company_id); audit(req.user.id, 'app', 'task.retry', `task:${t.id}`); return retryTask(t.id); });

  // ---------- Aprobaciones ----------
  app.get('/approvals', async (req) => {
    const s = scopeFilter(req.user);
    const status = req.query.status || 'pending';
    return q.all(`SELECT a.*, c.name company_name, cl.name client_name FROM approvals a LEFT JOIN companies c ON c.id = a.company_id LEFT JOIN clients cl ON cl.id = a.client_id
      WHERE ${s.sql.replace(/company_id/g, 'a.company_id')} ${status === 'all' ? '' : 'AND a.status = ?'} ORDER BY a.id DESC LIMIT 100`, ...s.params, ...(status === 'all' ? [] : [status]))
      .map((a) => ({ ...a, payload: j.parse(a.payload), decision_snapshot: j.parse(a.decision_snapshot), action_label: ACTION_LABEL[a.action],
        external: a.external_action_id ? q.get('SELECT status, external_id, delivery_status, confirmation, attempts, last_error FROM external_actions WHERE id = ?', a.external_action_id) : null }));
  });
  app.post('/approvals/:id/decide', async (req) => {
    assertCanAct(req.user);
    const a = q.get('SELECT * FROM approvals WHERE id = ?', Number(req.params.id));
    if (!a) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, a.company_id);
    if (req.body?.payload_hash && req.body.payload_hash !== a.payload_hash) throw Object.assign(new Error('Lo que viste ya no coincide con lo que se ejecutaría. Recargá.'), { statusCode: 409 });
    return decide(a.id, { user: req.user, decision: req.body?.decision === 'approve' ? 'approve' : 'reject', via: 'app', note: req.body?.note || null, userAgent: req.headers['user-agent'] });
  });

  // ---------- Entregables ----------
  app.get('/deliverables', async (req) => {
    const s = scopeFilter(req.user);
    const where = [s.sql];
    const params = [...s.params];
    if (req.query.company_id) { where.push('company_id = ?'); params.push(Number(req.query.company_id)); }
    if (req.query.client_id) { where.push('client_id = ?'); params.push(Number(req.query.client_id)); }
    if (req.query.kind) { where.push('kind = ?'); params.push(req.query.kind); }
    return q.all(`SELECT id, task_id, instruction_id, company_id, client_id, agent_slug, kind, title, substr(body,1,280) excerpt, mime, size, meta, created_at, is_demo FROM deliverables WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 100`, ...params)
      .map((d) => ({ ...d, meta: j.parse(d.meta, {}) }));
  });
  app.get('/deliverables/:id', async (req) => {
    const d = q.get('SELECT * FROM deliverables WHERE id = ?', Number(req.params.id));
    if (!d) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, d.company_id);
    return { ...d, file_path: undefined, meta: j.parse(d.meta, {}) };
  });
  app.get('/deliverables/:id/file', async (req, reply) => {
    const d = q.get('SELECT * FROM deliverables WHERE id = ?', Number(req.params.id));
    if (!d?.file_path) throw Object.assign(new Error('Sin archivo'), { statusCode: 404 });
    assertCompanyAccess(req.user, d.company_id);
    const file = req.query.thumb ? j.parse(d.meta, {}).thumbnail : d.file_path;
    if (!file || !fs.existsSync(file)) throw Object.assign(new Error('Archivo no encontrado'), { statusCode: 404 });
    if (req.query.download) reply.header('content-disposition', `attachment; filename="${path.basename(file)}"`);
    return reply.sendFile(path.basename(file), path.dirname(file));
  });

  // ---------- Empresas, clientes y contactos ----------
  app.get('/companies', async (req) => q.all(`SELECT * FROM companies WHERE id IN (${allowedCompanyIds(req.user).join(',') || 'NULL'})`).map((c) => ({
    ...c, clients: q.all('SELECT * FROM clients WHERE company_id = ? ORDER BY name', c.id),
  })));
  app.post('/clients', async (req) => {
    assertCanAct(req.user);
    const { company_id, name, handle, notes } = req.body || {};
    assertCompanyAccess(req.user, num(company_id));
    if (!name?.trim()) throw Object.assign(new Error('Falta el nombre'), { statusCode: 400 });
    const r = q.run('INSERT INTO clients(company_id, name, handle, notes, is_demo) VALUES (?,?,?,?,?)', num(company_id), name.trim(), handle || null, notes || null, config.demo ? 1 : 0);
    audit(req.user.id, 'app', 'client.create', `client:${r.lastInsertRowid}`, { name });
    emit('client.created', `Cliente nuevo: ${name}`, { company_id: num(company_id), client_id: Number(r.lastInsertRowid) });
    return q.get('SELECT * FROM clients WHERE id = ?', Number(r.lastInsertRowid));
  });
  app.patch('/clients/:id', async (req) => {
    assertCanAct(req.user);
    const c = q.get('SELECT * FROM clients WHERE id = ?', Number(req.params.id));
    assertCompanyAccess(req.user, c?.company_id);
    const { name = c.name, handle = c.handle, notes = c.notes, status = c.status } = req.body || {};
    q.run('UPDATE clients SET name = ?, handle = ?, notes = ?, status = ? WHERE id = ?', name, handle, notes, status, c.id);
    return q.get('SELECT * FROM clients WHERE id = ?', c.id);
  });
  app.get('/contacts', async (req) => {
    const s = scopeFilter(req.user);
    return q.all(`SELECT * FROM contacts WHERE ${s.sql} ${req.query.company_id ? 'AND company_id = ?' : ''} ORDER BY id DESC LIMIT 200`, ...s.params, ...(req.query.company_id ? [Number(req.query.company_id)] : []));
  });
  app.post('/contacts', async (req) => {
    assertCanAct(req.user);
    const b = req.body || {};
    assertCompanyAccess(req.user, num(b.company_id));
    const r = q.run('INSERT INTO contacts(company_id, client_id, kind, name, phone, email, opt_in_at, opt_in_source, notes, is_demo) VALUES (?,?,?,?,?,?,?,?,?,?)',
      num(b.company_id), num(b.client_id), b.kind || 'lead', b.name || null, b.phone ? String(b.phone).replace(/\D/g, '') : null, b.email || null,
      b.opt_in_source ? nowIso() : null, b.opt_in_source || null, b.notes || null, config.demo ? 1 : 0);
    return q.get('SELECT * FROM contacts WHERE id = ?', Number(r.lastInsertRowid));
  });

  // ---------- Memoria ----------
  app.get('/memory', async (req) => {
    const companyId = num(req.query.company_id);
    assertCompanyAccess(req.user, companyId);
    const clientId = num(req.query.client_id);
    return q.all(`SELECT m.*, u.name created_by_name FROM memory_items m LEFT JOIN users u ON u.id = m.created_by WHERE m.company_id = ? AND ${clientId ? 'm.client_id = ?' : 'm.client_id IS NULL'} AND m.deleted_at IS NULL ORDER BY m.updated_at DESC`,
      companyId, ...(clientId ? [clientId] : []));
  });
  app.post('/memory', async (req) => {
    assertCanAct(req.user);
    const b = req.body || {};
    assertCompanyAccess(req.user, num(b.company_id));
    if (!b.content?.trim()) throw Object.assign(new Error('Falta el contenido'), { statusCode: 400 });
    if (num(b.client_id)) { const c = q.get('SELECT company_id FROM clients WHERE id = ?', num(b.client_id)); if (c?.company_id !== num(b.company_id)) throw Object.assign(new Error('Cliente fuera de la empresa'), { statusCode: 400 }); }
    const r = q.run('INSERT INTO memory_items(company_id, client_id, kind, title, content, source, source_date, created_by, is_demo) VALUES (?,?,?,?,?,?,?,?,?)',
      num(b.company_id), num(b.client_id), b.kind || 'fact', b.title || null, b.content.trim(), b.source || `Cargado por ${req.user.name}`, b.source_date || nowIso().slice(0, 10), req.user.id, config.demo ? 1 : 0);
    audit(req.user.id, 'app', 'memory.create', `memory:${r.lastInsertRowid}`);
    return q.get('SELECT * FROM memory_items WHERE id = ?', Number(r.lastInsertRowid));
  });
  app.patch('/memory/:id', async (req) => {
    assertCanAct(req.user);
    const m = q.get('SELECT * FROM memory_items WHERE id = ? AND deleted_at IS NULL', Number(req.params.id));
    if (!m) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, m.company_id);
    const b = req.body || {};
    q.run(`UPDATE memory_items SET kind = ?, title = ?, content = ?, source = ?, source_date = ?, updated_at = datetime('now') WHERE id = ?`,
      b.kind ?? m.kind, b.title ?? m.title, b.content ?? m.content, b.source ?? `${m.source} · corregido por ${req.user.name}`, b.source_date ?? nowIso().slice(0, 10), m.id);
    audit(req.user.id, 'app', 'memory.update', `memory:${m.id}`);
    return q.get('SELECT * FROM memory_items WHERE id = ?', m.id);
  });
  app.delete('/memory/:id', async (req) => {
    assertCanAct(req.user);
    const m = q.get('SELECT * FROM memory_items WHERE id = ?', Number(req.params.id));
    if (!m) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, m.company_id);
    q.run('DELETE FROM memory_items WHERE id = ?', m.id); // eliminación real
    audit(req.user.id, 'app', 'memory.delete', `memory:${m.id}`);
    return { ok: true };
  });

  // ---------- Archivos ----------
  app.post('/files', async (req) => {
    assertCanAct(req.user);
    const parts = req.parts();
    const fields = {};
    const saved = [];
    for await (const part of parts) {
      if (part.type === 'field') { fields[part.fieldname] = part.value; continue; }
      const companyId = num(fields.company_id);
      assertCompanyAccess(req.user, companyId);
      const clientId = num(fields.client_id);
      if (clientId) { const c = q.get('SELECT company_id FROM clients WHERE id = ?', clientId); if (c?.company_id !== companyId) throw Object.assign(new Error('Cliente fuera de la empresa'), { statusCode: 400 }); }
      if (!/^(image|video|audio)\/|^application\/pdf$|^text\//.test(part.mimetype) && !/officedocument/.test(part.mimetype)) throw Object.assign(new Error(`Tipo de archivo no admitido: ${part.mimetype}`), { statusCode: 415 });
      const dir = path.join(config.filesDir, 'uploads', String(companyId), clientId ? String(clientId) : 'general');
      fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(part.filename || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8);
      const dest = path.join(dir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
      const hash = crypto.createHash('sha256');
      part.file.on('data', (c) => hash.update(c));
      await pipeline(part.file, fs.createWriteStream(dest));
      if (part.file.truncated) { fs.rmSync(dest); throw Object.assign(new Error('Archivo demasiado grande (máx. 200 MB)'), { statusCode: 413 }); }
      const size = fs.statSync(dest).size;
      const kind = part.mimetype.startsWith('image/') ? 'photo' : part.mimetype.startsWith('audio/') ? (fields.license_note ? 'license_audio' : 'audio') : 'document';
      const r = q.run('INSERT INTO files(company_id, client_id, original_name, stored_path, mime, size, sha256, kind, source, license_note, uploaded_by, is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        companyId, clientId, (part.filename || 'archivo').slice(0, 200), dest, part.mimetype, size, hash.digest('hex'), kind, 'app', fields.license_note || null, req.user.id, config.demo ? 1 : 0);
      saved.push(Number(r.lastInsertRowid));
    }
    if (saved.length) emit('files.uploaded', `${saved.length} archivo(s) cargado(s)`, { company_id: num(fields.company_id), client_id: num(fields.client_id) });
    return q.all(`SELECT id, original_name, mime, size, kind, license_note, created_at FROM files WHERE id IN (${saved.join(',') || 'NULL'})`);
  });
  app.get('/files', async (req) => {
    const companyId = num(req.query.company_id);
    assertCompanyAccess(req.user, companyId);
    const clientId = num(req.query.client_id);
    return q.all(`SELECT id, company_id, client_id, original_name, mime, size, kind, source, license_note, created_at FROM files WHERE company_id = ? AND ${clientId ? 'client_id = ?' : 'client_id IS NULL'} AND deleted_at IS NULL ORDER BY id DESC`, companyId, ...(clientId ? [clientId] : []));
  });
  app.get('/files/:id/raw', async (req, reply) => {
    const f = q.get('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL', Number(req.params.id));
    if (!f) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, f.company_id);
    return reply.sendFile(path.basename(f.stored_path), path.dirname(f.stored_path));
  });
  app.delete('/files/:id', async (req) => {
    assertCanAct(req.user);
    const f = q.get('SELECT * FROM files WHERE id = ?', Number(req.params.id));
    if (!f) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    assertCompanyAccess(req.user, f.company_id);
    fs.rmSync(f.stored_path, { force: true });
    q.run('UPDATE files SET deleted_at = ? WHERE id = ?', nowIso(), f.id);
    audit(req.user.id, 'app', 'file.delete', `file:${f.id}`);
    return { ok: true };
  });
  app.post('/files/import-drive', async (req) => {
    assertCanAct(req.user);
    const { folder_id, company_id, client_id } = req.body || {};
    assertCompanyAccess(req.user, num(company_id));
    const list = await google.driveListImages(folder_id);
    const dir = path.join(config.filesDir, 'uploads', String(company_id), client_id ? String(client_id) : 'general');
    fs.mkdirSync(dir, { recursive: true });
    const out = [];
    for (const f of (list.files || []).filter((x) => x.mimeType.startsWith('image/')).slice(0, 40)) {
      if (q.get('SELECT 1 FROM files WHERE source = ? AND source_ref = ? AND deleted_at IS NULL', 'drive', f.id)) continue;
      const buf = await google.driveDownload(f.id);
      const dest = path.join(dir, `${Date.now()}-${f.id.slice(0, 8)}${path.extname(f.name) || '.jpg'}`);
      fs.writeFileSync(dest, buf);
      const r = q.run('INSERT INTO files(company_id, client_id, original_name, stored_path, mime, size, sha256, kind, source, source_ref, uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        num(company_id), num(client_id), f.name, dest, f.mimeType, buf.length, crypto.createHash('sha256').update(buf).digest('hex'), 'photo', 'drive', f.id, req.user.id);
      out.push(Number(r.lastInsertRowid));
    }
    emit('files.uploaded', `${out.length} foto(s) importadas desde Google Drive`, { company_id: num(company_id), client_id: num(client_id), agent_slug: 'documentos' });
    return { imported: out.length };
  });

  // ---------- Selección (Elite Hunters) ----------
  const eh = () => q.get(`SELECT id FROM companies WHERE slug = 'elite-hunters'`).id;
  const assertEH = (user) => assertCompanyAccess(user, eh());
  app.get('/recruiting/searches', async (req) => {
    assertEH(req.user);
    return q.all('SELECT * FROM rec_searches WHERE company_id = ? ORDER BY id DESC', eh()).map((s) => ({
      ...s, stages: Object.fromEntries(q.all('SELECT stage, COUNT(*) c FROM rec_applications WHERE search_id = ? GROUP BY stage', s.id).map((r) => [r.stage, r.c])),
    }));
  });
  app.post('/recruiting/searches', async (req) => {
    assertCanAct(req.user); assertEH(req.user);
    const b = req.body || {};
    if (!b.hiring_company || !b.role_title) throw Object.assign(new Error('Faltan empresa y puesto'), { statusCode: 400 });
    const r = q.run('INSERT INTO rec_searches(company_id, hiring_company, role_title, location, commercial_terms, guarantee_days, notes, is_demo) VALUES (?,?,?,?,?,?,?,?)',
      eh(), b.hiring_company, b.role_title, b.location || null, b.commercial_terms || null, num(b.guarantee_days), b.notes || null, config.demo ? 1 : 0);
    emit('recruiting.search', `Búsqueda nueva: ${b.role_title} · ${b.hiring_company}`, { company_id: eh(), agent_slug: 'coord-busquedas' });
    return q.get('SELECT * FROM rec_searches WHERE id = ?', Number(r.lastInsertRowid));
  });
  app.get('/recruiting/searches/:id', async (req) => {
    assertEH(req.user);
    const s = q.get('SELECT * FROM rec_searches WHERE id = ? AND company_id = ?', Number(req.params.id), eh());
    if (!s) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    return { ...s, applications: q.all(`SELECT a.*, c.full_name, c.phone, c.email, c.location cand_location, c.summary, c.consent_at, c.videocv_file_id, u.name decided_by_name FROM rec_applications a JOIN rec_candidates c ON c.id = a.candidate_id LEFT JOIN users u ON u.id = a.human_decision_by WHERE a.search_id = ? ORDER BY a.id`, s.id)
      .map((a) => ({ ...a, interviews: q.all('SELECT * FROM rec_interviews WHERE application_id = ? ORDER BY id', a.id) })) };
  });
  app.post('/recruiting/candidates', async (req) => {
    assertCanAct(req.user); assertEH(req.user);
    const b = req.body || {};
    if (!b.full_name) throw Object.assign(new Error('Falta el nombre'), { statusCode: 400 });
    const r = q.run('INSERT INTO rec_candidates(company_id, full_name, phone, email, location, summary, consent_at, is_demo) VALUES (?,?,?,?,?,?,?,?)',
      eh(), b.full_name, b.phone ? String(b.phone).replace(/\D/g, '') : null, b.email || null, b.location || null, b.summary || null, b.consent ? nowIso() : null, config.demo ? 1 : 0);
    const cid = Number(r.lastInsertRowid);
    if (num(b.search_id)) q.run('INSERT OR IGNORE INTO rec_applications(search_id, candidate_id, is_demo) VALUES (?,?,?)', num(b.search_id), cid, config.demo ? 1 : 0);
    return q.get('SELECT * FROM rec_candidates WHERE id = ?', cid);
  });
  app.patch('/recruiting/applications/:id', async (req) => {
    assertCanAct(req.user); assertEH(req.user);
    const a = q.get('SELECT * FROM rec_applications WHERE id = ?', Number(req.params.id));
    if (!a) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    const b = req.body || {};
    if (b.stage === 'contratado' && !a.human_decision) throw Object.assign(new Error('Registrá primero tu decisión sobre el candidato'), { statusCode: 400 });
    const s = q.get('SELECT guarantee_days FROM rec_searches WHERE id = ?', a.search_id);
    const start = b.start_date ?? a.start_date;
    const guarantee = b.guarantee_until ?? a.guarantee_until ?? (b.stage === 'contratado' && start && s.guarantee_days ? new Date(Date.parse(start) + s.guarantee_days * 86400_000).toISOString().slice(0, 10) : null);
    q.run(`UPDATE rec_applications SET stage = ?, start_date = ?, guarantee_until = ?, guarantee_status = ?, presented_at = ?, hired_at = ?, updated_at = datetime('now') WHERE id = ?`,
      b.stage ?? a.stage, start, guarantee, b.guarantee_status ?? a.guarantee_status ?? (b.stage === 'contratado' ? 'en_curso' : null),
      b.stage === 'presentado' && !a.presented_at ? nowIso() : a.presented_at, b.stage === 'contratado' && !a.hired_at ? nowIso() : a.hired_at, a.id);
    audit(req.user.id, 'app', 'recruiting.stage', `application:${a.id}`, b);
    emit('recruiting.stage', `Postulación #${a.id}: ${b.stage ?? a.stage}`, { company_id: eh(), agent_slug: 'coord-busquedas' });
    return q.get('SELECT * FROM rec_applications WHERE id = ?', a.id);
  });
  app.post('/recruiting/applications/:id/decision', async (req) => {
    // Decisión humana obligatoria: solo una persona autenticada puede registrarla.
    assertCanAct(req.user); assertEH(req.user);
    const a = q.get('SELECT * FROM rec_applications WHERE id = ?', Number(req.params.id));
    if (!a) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    const d = req.body?.decision;
    if (!['avanzar', 'descartar', 'en_espera'].includes(d)) throw Object.assign(new Error('Decisión inválida'), { statusCode: 400 });
    q.run(`UPDATE rec_applications SET human_decision = ?, human_decision_by = ?, human_decision_at = ?, human_decision_note = ?, stage = CASE WHEN ? = 'descartar' THEN 'descartado' ELSE stage END, updated_at = datetime('now') WHERE id = ?`,
      d, req.user.id, nowIso(), req.body?.note || null, d, a.id);
    audit(req.user.id, 'app', 'recruiting.decision', `application:${a.id}`, { decision: d, note: req.body?.note });
    emit('recruiting.decision', `Decisión humana sobre postulación #${a.id}: ${d}`, { company_id: eh(), agent_slug: 'coord-busquedas', level: 'success' });
    return q.get('SELECT * FROM rec_applications WHERE id = ?', a.id);
  });
  app.post('/recruiting/interviews', async (req) => {
    assertCanAct(req.user); assertEH(req.user);
    const b = req.body || {};
    const r = q.run('INSERT INTO rec_interviews(application_id, scheduled_at, interviewer, mode, status, notes, is_demo) VALUES (?,?,?,?,?,?,?)',
      num(b.application_id), b.scheduled_at || null, b.interviewer || null, b.mode || null, b.status || 'propuesta', b.notes || null, config.demo ? 1 : 0);
    if (b.scheduled_at) q.run(`UPDATE rec_applications SET stage = 'entrevista_agendada' WHERE id = ? AND stage IN ('postulado','preseleccion')`, num(b.application_id));
    return q.get('SELECT * FROM rec_interviews WHERE id = ?', Number(r.lastInsertRowid));
  });
  app.patch('/recruiting/interviews/:id', async (req) => {
    assertCanAct(req.user); assertEH(req.user);
    const i = q.get('SELECT * FROM rec_interviews WHERE id = ?', Number(req.params.id));
    const b = req.body || {};
    q.run('UPDATE rec_interviews SET scheduled_at = ?, status = ?, notes = ?, mode = ? WHERE id = ?', b.scheduled_at ?? i.scheduled_at, b.status ?? i.status, b.notes ?? i.notes, b.mode ?? i.mode, i.id);
    if (b.status === 'realizada') q.run(`UPDATE rec_applications SET stage = 'entrevistado' WHERE id = ? AND stage IN ('postulado','preseleccion','entrevista_agendada')`, i.application_id);
    return q.get('SELECT * FROM rec_interviews WHERE id = ?', i.id);
  });

  // ---------- Conversaciones ----------
  app.get('/conversations', async (req) => {
    const s = scopeFilter(req.user, 'c');
    return q.all(`SELECT c.*, ct.name contact_name, ct.phone contact_phone, co.name company_name,
      (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.private = 0 ORDER BY m.id DESC LIMIT 1) last_message
      FROM conversations c LEFT JOIN contacts ct ON ct.id = c.contact_id LEFT JOIN companies co ON co.id = c.company_id
      WHERE (${s.sql} OR (c.mode = 'director' AND c.admin_user_id = ?)) ORDER BY COALESCE(c.last_inbound_at, c.created_at) DESC LIMIT 100`, ...s.params, req.user.id);
  });
  app.get('/conversations/:id', async (req) => {
    const c = q.get('SELECT * FROM conversations WHERE id = ?', Number(req.params.id));
    if (!c) throw Object.assign(new Error('No existe'), { statusCode: 404 });
    if (!(c.mode === 'director' && c.admin_user_id === req.user.id)) assertCompanyAccess(req.user, c.company_id);
    return { ...c, messages: q.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id', c.id).map((m) => ({ ...m, attachments: j.parse(m.attachments, []) })) };
  });
  app.post('/conversations/:id/pause', async (req) => { assertCanAct(req.user); const c = q.get('SELECT * FROM conversations WHERE id = ?', Number(req.params.id)); assertCompanyAccess(req.user, c?.company_id); pauseConversation(c.id, `Pausado por ${req.user.name} desde la app`); return { ok: true }; });
  app.post('/conversations/:id/resume', async (req) => { assertCanAct(req.user); const c = q.get('SELECT * FROM conversations WHERE id = ?', Number(req.params.id)); assertCompanyAccess(req.user, c?.company_id); resumeConversation(c.id, `Reactivado por ${req.user.name}`); return { ok: true }; });

  // ---------- Integraciones ----------
  app.get('/integrations', async () => integrationStatuses());
  app.post('/integrations/:key/test', async (req) => { assertCanAct(req.user); return testIntegration(req.params.key); });
  app.get('/integrations/google/connect', async (req, reply) => {
    assertCanAct(req.user);
    if (!googleConfigured()) throw Object.assign(new Error('Falta configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI'), { statusCode: 400 });
    return reply.redirect(authUrl(req.user.id));
  });

  // ---------- Ajustes, gasto y pausa ----------
  app.get('/settings', async (req) => ({ autonomy: getSetting('autonomy'), limits: limits(), paused: !!getSetting('automations_paused'), spend: periodSpend(),
    spend_by_day: q.all(`SELECT date(ts) day, ROUND(SUM(usd),4) usd FROM spend_ledger WHERE ts > datetime('now','-30 days') GROUP BY day ORDER BY day`),
    webhook_url: req.user.role === 'owner' ? webhookUrl() : null, public_url: config.publicUrl }));
  app.put('/settings/autonomy', async (req) => {
    if (req.user.role !== 'owner') throw new PermissionError('Solo el dueño cambia reglas de autonomía');
    const cur = getSetting('autonomy');
    const b = req.body || {};
    const valid = (v) => ['draft', 'auto', 'off', 'approval'].includes(v);
    const next = { ...cur, external_reply: { ...cur.external_reply, ...Object.fromEntries(Object.entries(b.external_reply || {}).filter(([, v]) => valid(v))) }, actions: { ...cur.actions, ...Object.fromEntries(Object.entries(b.actions || {}).filter(([, v]) => valid(v))) } };
    setSetting('autonomy', next);
    audit(req.user.id, 'app', 'autonomy.update', null, next);
    emit('settings.autonomy', 'Reglas de autonomía actualizadas', { agent_slug: 'automatizaciones' });
    return next;
  });
  app.put('/settings/limits', async (req) => {
    if (req.user.role !== 'owner') throw new PermissionError('Solo el dueño cambia límites');
    const b = req.body || {};
    const next = { ...limits() };
    for (const k of ['taskUsd', 'dailyUsd', 'monthlyUsd', 'alertRatio']) if (b[k] !== undefined && Number(b[k]) >= 0) next[k] = Number(b[k]);
    setSetting('limits', next);
    audit(req.user.id, 'app', 'limits.update', null, next);
    return next;
  });
  app.post('/settings/pause', async (req) => {
    assertCanAct(req.user);
    const paused = !!req.body?.paused;
    setSetting('automations_paused', paused);
    audit(req.user.id, 'app', paused ? 'automations.pause' : 'automations.resume', null);
    emit(paused ? 'automations.paused' : 'automations.resumed', paused ? `${req.user.name} pausó todas las automatizaciones` : `${req.user.name} reanudó las automatizaciones`, { level: paused ? 'warning' : 'success', agent_slug: 'automatizaciones' });
    return { paused };
  });

  // ---------- Búsqueda global ----------
  app.get('/search', async (req) => {
    const term = String(req.query.q || '').trim();
    if (term.length < 2) return { tasks: [], clients: [], contacts: [], conversations: [], deliverables: [], agents: [] };
    const like = `%${term}%`;
    const s = scopeFilter(req.user);
    const sc = scopeFilter(req.user, 'c');
    return {
      agents: q.all('SELECT slug, name, role, department FROM agents WHERE role LIKE ? OR name LIKE ? LIMIT 8', like, like),
      tasks: q.all(`SELECT id, title, status, agent_slug FROM tasks WHERE ${s.sql} AND (title LIKE ? OR input LIKE ? OR result_summary LIKE ?) ORDER BY id DESC LIMIT 10`, ...s.params, like, like, like),
      clients: q.all(`SELECT id, name, company_id FROM clients WHERE ${s.sql} AND name LIKE ? LIMIT 10`, ...s.params, like),
      contacts: q.all(`SELECT id, name, phone, company_id FROM contacts WHERE ${s.sql} AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) LIMIT 10`, ...s.params, like, like, like),
      conversations: q.all(`SELECT DISTINCT c.id, ct.name contact_name, m.content FROM messages m JOIN conversations c ON c.id = m.conversation_id LEFT JOIN contacts ct ON ct.id = c.contact_id WHERE ${sc.sql} AND m.content LIKE ? ORDER BY m.id DESC LIMIT 10`, ...sc.params, like),
      deliverables: q.all(`SELECT id, title, kind FROM deliverables WHERE ${s.sql} AND (title LIKE ? OR body LIKE ?) ORDER BY id DESC LIMIT 10`, ...s.params, like, like),
    };
  });
}

export async function oauthRoutes(app) {
  app.get('/oauth/google/callback', async (req, reply) => {
    try {
      const r = await handleCallback(req.query.code, req.query.state);
      for (const k of ['google_gmail', 'google_calendar', 'google_drive']) await testIntegration(k);
      emit('integration.connected', `Google autorizado (${r.scopes.length} permisos)`, { level: 'success', agent_slug: 'monitor' });
      return reply.redirect('/#/integraciones?google=ok');
    } catch (e) {
      emit('integration.error', `Autorización de Google falló: ${e.message}`, { level: 'error', agent_slug: 'monitor' });
      return reply.redirect(`/#/integraciones?google=error`);
    }
  });
}
