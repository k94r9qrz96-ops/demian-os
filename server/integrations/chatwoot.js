// Cliente de Chatwoot (API oficial). Endpoints verificados en developers.chatwoot.com (2026-10-17):
//  POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages   (content, message_type, private)
//  POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/toggle_status (status: open|pending|resolved)
//  GET  /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages
//  GET  /api/v1/profile ; GET /api/v1/accounts/{account_id}/inboxes
// Autenticación: header `api_access_token` (compatible con todas las versiones) o `Authorization: Bearer` (v4.19+).
import crypto from 'node:crypto';
import { config } from '../config.js';
import { redact } from '../lib/util.js';

export function chatwootConfigured() {
  const c = config.chatwoot;
  return !!(c.baseUrl && c.accountId && (c.botToken || c.userToken));
}

async function request(method, path, body, { as = 'bot', signal } = {}) {
  const c = config.chatwoot;
  const token = as === 'user' ? c.userToken || c.botToken : c.botToken || c.userToken;
  if (!c.baseUrl || !token) throw Object.assign(new Error('Chatwoot no está configurado (CHATWOOT_BASE_URL y token)'), { noRetry: true });
  const headers = { 'content-type': 'application/json' };
  if (process.env.CHATWOOT_AUTH_STYLE === 'bearer') headers.authorization = `Bearer ${token}`;
  else headers.api_access_token = token;
  let res;
  try {
    res = await fetch(`${c.baseUrl.replace(/\/$/, '')}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: signal ?? AbortSignal.timeout(20_000) });
  } catch (e) {
    throw new Error(`Chatwoot no responde: ${redact(e.message)}`); // reintentable, se verifica antes de reenviar
  }
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Chatwoot ${res.status}: ${redact(text.slice(0, 240))}`);
    err.status = res.status;
    if (res.status >= 400 && res.status < 500 && res.status !== 429) err.noRetry = true;
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

const acc = () => `/api/v1/accounts/${config.chatwoot.accountId}`;

export const chatwoot = {
  profile: () => request('GET', '/api/v1/profile', null, { as: 'user' }),
  inboxes: () => request('GET', `${acc()}/inboxes`, null, { as: 'user' }),
  sendMessage: ({ conversationId, content, isPrivate = false }) =>
    request('POST', `${acc()}/conversations/${conversationId}/messages`, { content, message_type: 'outgoing', private: !!isPrivate }),
  toggleStatus: (conversationId, status) => request('POST', `${acc()}/conversations/${conversationId}/toggle_status`, { status }),
  listMessages: (conversationId) => request('GET', `${acc()}/conversations/${conversationId}/messages`, null, { as: 'user' }),
};

// Verificación HMAC de webhooks (documentado en "Verifying webhooks"):
// X-Chatwoot-Signature = "sha256=" + HMAC_SHA256(secret, `${timestamp}.${raw_body}`)
export function verifySignature(rawBody, headers, secret = config.chatwoot.webhookSecret, maxAgeSec = 300) {
  const sig = headers['x-chatwoot-signature'];
  const ts = headers['x-chatwoot-timestamp'];
  if (!sig || !ts) return { ok: false, reason: 'faltan encabezados de firma' };
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > maxAgeSec) return { ok: false, reason: 'firma vencida (posible reenvío)' };
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${ts}.`).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'firma inválida' };
  return { ok: true };
}

export function signForTest(rawBody, secret, ts = Math.floor(Date.now() / 1000)) {
  return { 'x-chatwoot-timestamp': String(ts), 'x-chatwoot-signature': 'sha256=' + crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex') };
}
