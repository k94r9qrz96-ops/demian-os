// Utilidades de prueba. Cada archivo de prueba corre en su propio proceso con su propia base temporal.
// Las pruebas con Chatwoot y Claude usan servidores/proveedores SIMULADOS (claramente marcados).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

export async function setup(name, extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `demian-os-${name}-`));
  Object.assign(process.env, {
    DOTENV_PATH: '/nonexistent', DATA_DIR: dir, DEMO_MODE: '', SESSION_SECRET: 'x'.repeat(40),
    APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), WORKER_POLL_MS: '50', CHATWOOT_REPLY_DEBOUNCE_MS: '0',
    ANTHROPIC_API_KEY: '', ...extraEnv,
  });
  const db = await import('../server/db.js');
  db.openDb();
  const roster = await import('../server/agents/roster.js');
  roster.seedCompanies();
  roster.seedRoster();
  const auth = await import('../server/lib/auth.js');
  const owner = auth.createUser({ email: 'demian@test.local', name: 'Demian', password: 'contraseña-segura-1', role: 'owner' });
  const worker = await import('../server/worker.js');
  worker.registerJobs();
  const queue = await import('../server/lib/queue.js');
  const { buildApp } = await import('../server/app.js');
  const app = await buildApp();
  const login = async (email = 'demian@test.local', password = 'contraseña-segura-1') => {
    const r = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-requested-with': 'demian-os' }, payload: { email, password } });
    return r.cookies.find((c) => c.name === 'dos_sid').value;
  };
  const sid = await login();
  const call = async (method, url, payload, cookie = sid) => {
    const r = await app.inject({ method, url, payload, headers: { 'x-requested-with': 'demian-os', ...(cookie ? { cookie: `dos_sid=${cookie}` } : {}) } });
    let body; try { body = r.json(); } catch { body = r.body; }
    return { status: r.statusCode, body, headers: r.headers, raw: r };
  };
  const company = (slug) => db.q.get('SELECT id FROM companies WHERE slug = ?', slug).id;
  return { dir, db, app, call, login, owner, queue, auth, company, drain: (ms) => queue.drain(ms) };
}

// Chatwoot SIMULADO: implementa los endpoints que usa Demian OS.
export function mockChatwoot({ dropResponseOnFirstSend = false } = {}) {
  const state = { messages: [], toggles: [], sends: 0, profileCalls: 0, down: false };
  let nextId = 1000;
  const server = http.createServer(async (req, res) => {
    if (state.down) { req.socket.destroy(); return; }
    let body = '';
    for await (const c of req) body += c;
    const json = body ? JSON.parse(body) : null;
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (!req.headers.api_access_token) return send(401, { error: 'sin token' });
    let m;
    if (req.method === 'GET' && req.url === '/api/v1/profile') { state.profileCalls++; return send(200, { email: 'agente@chatwoot.simulado' }); }
    if (req.method === 'GET' && /\/inboxes$/.test(req.url)) return send(200, { payload: [{ id: 7, name: 'WhatsApp Rushy', channel_type: 'Channel::Whatsapp', phone_number: '+5490000000000' }] });
    if ((m = req.url.match(/conversations\/([^/]+)\/messages$/))) {
      if (req.method === 'POST') {
        state.sends++;
        const msg = { id: nextId++, content: json.content, private: !!json.private, message_type: 1, conversation_id: m[1], created_at: Math.floor(Date.now() / 1000), status: 'sent', sender_type: 'AgentBot' };
        state.messages.push(msg);
        if (dropResponseOnFirstSend && state.sends === 1) { req.socket.destroy(); return; } // se procesó pero no llega la confirmación
        return send(200, msg);
      }
      return send(200, { payload: state.messages.filter((x) => String(x.conversation_id) === m[1]) });
    }
    if ((m = req.url.match(/conversations\/([^/]+)\/toggle_status$/))) { state.toggles.push({ conversation: m[1], status: json.status }); return send(200, { payload: { success: true, current_status: json.status } }); }
    send(404, { error: 'no simulado' });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ state, server, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) })));
}

export function incoming({ id, conversationId = 55, inboxId = 7, phone = '+5491100000000', name = 'Cliente Prueba', content, attachments = [] }) {
  return { event: 'message_created', id, content, message_type: 'incoming', private: false, created_at: Math.floor(Date.now() / 1000),
    sender: { id: 9, name, phone_number: phone, type: 'contact' }, account: { id: 1 }, attachments,
    conversation: { id: conversationId, inbox_id: inboxId, status: 'pending', account_id: 1, meta: { sender: { name, phone_number: phone } } }, inbox: { id: inboxId } };
}
export function outgoingHuman({ id, conversationId = 55, inboxId = 7, content }) {
  return { event: 'message_created', id, content, message_type: 'outgoing', private: false, sender: { id: 3, name: 'Demian (humano)', type: 'user' }, account: { id: 1 }, conversation: { id: conversationId, inbox_id: inboxId, status: 'open', account_id: 1 } };
}

export async function postWebhook(app, payload, secret, { token } = {}) {
  const { signForTest } = await import('../server/integrations/chatwoot.js');
  const raw = JSON.stringify(payload);
  const headers = { 'content-type': 'application/json', ...(secret ? signForTest(raw, secret) : {}) };
  const r = await app.inject({ method: 'POST', url: `/webhooks/chatwoot${token ? `/${token}` : ''}`, payload: raw, headers });
  return { status: r.statusCode, body: r.json() };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
