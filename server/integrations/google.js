// Google (Gmail, Calendar, Drive) con OAuth 2.0 propio de Demian OS.
// Las conexiones de Google que existen en tu chat de Claude no pueden ser usadas por un servidor propio:
// este backend necesita su propio cliente OAuth (Google Cloud Console). Los tokens se guardan cifrados.
import { config } from '../config.js';
import { q, j, nowIso } from '../db.js';
import { encrypt, decrypt, redact, randomId } from '../lib/util.js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'openid', 'email',
];

export const googleConfigured = () => !!(config.google.clientId && config.google.clientSecret && config.google.redirectUri);

export function authUrl(userId) {
  const state = randomId(16);
  q.run(`INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, `oauth_state:${state}`, j.str({ userId, ts: Date.now() }));
  const p = new URLSearchParams({
    client_id: config.google.clientId, redirect_uri: config.google.redirectUri, response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function handleCallback(code, state) {
  const row = q.get('SELECT value FROM settings WHERE key = ?', `oauth_state:${state}`);
  if (!row) throw new Error('Estado OAuth inválido o vencido');
  q.run('DELETE FROM settings WHERE key = ?', `oauth_state:${state}`);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.google.clientId, client_secret: config.google.clientSecret, redirect_uri: config.google.redirectUri, grant_type: 'authorization_code' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google rechazó el código: ${redact(JSON.stringify(data))}`);
  saveTokens({ ...data, obtained_at: Date.now() });
  return { scopes: (data.scope || '').split(' ') };
}

function saveTokens(t) {
  const prev = loadTokens();
  const merged = { ...prev, ...t, refresh_token: t.refresh_token || prev?.refresh_token };
  q.run(`INSERT INTO integrations(key, status, tokens_enc, last_checked_at) VALUES ('google', 'connected', ?, ?)
         ON CONFLICT(key) DO UPDATE SET tokens_enc = excluded.tokens_enc, status = 'connected', last_checked_at = excluded.last_checked_at`, encrypt(merged), nowIso());
}

function loadTokens() {
  const r = q.get(`SELECT tokens_enc FROM integrations WHERE key = 'google'`);
  if (!r?.tokens_enc) return null;
  try { return decrypt(r.tokens_enc); } catch { return null; }
}

export function googleGrantedScopes() {
  return (loadTokens()?.scope || '').split(' ').filter(Boolean);
}

async function accessToken() {
  const t = loadTokens();
  if (!t) throw Object.assign(new Error('Google no autorizado todavía'), { noRetry: true, code: 'pending_auth' });
  if (t.access_token && Date.now() < t.obtained_at + (t.expires_in - 60) * 1000) return t.access_token;
  if (!t.refresh_token) throw Object.assign(new Error('Falta refresh_token: volvé a autorizar Google'), { noRetry: true, code: 'pending_auth' });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: t.refresh_token, client_id: config.google.clientId, client_secret: config.google.clientSecret, grant_type: 'refresh_token' }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(`No se pudo renovar el acceso a Google: ${data.error || res.status}`), { noRetry: data.error === 'invalid_grant', code: 'pending_auth' });
  saveTokens({ ...data, obtained_at: Date.now() });
  return data.access_token;
}

async function g(method, url, body, { raw = false } = {}) {
  const token = await accessToken();
  let res;
  try {
    res = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25_000) });
  } catch (e) {
    throw new Error(`Google no responde: ${redact(e.message)}`);
  }
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Google ${res.status}: ${redact(text.slice(0, 240))}`);
    err.status = res.status;
    if (res.status === 403) err.code = 'insufficient_permissions';
    if (res.status >= 400 && res.status < 500 && res.status !== 429) err.noRetry = true;
    throw err;
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
}

function b64url(s) { return Buffer.from(s).toString('base64url'); }
function encodeHeader(s) { return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`; }

export const google = {
  gmailProfile: () => g('GET', 'https://gmail.googleapis.com/gmail/v1/users/me/profile'),
  async sendMail({ to, subject, body_text }, key) {
    const messageId = `<${key.replace(/[^a-zA-Z0-9]/g, '-')}@demian-os>`;
    const mime = [`To: ${to}`, `Subject: ${encodeHeader(subject)}`, `Message-ID: ${messageId}`, 'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(body_text).toString('base64')].join('\r\n');
    const r = await g('POST', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw: b64url(mime) });
    return { external_id: r.id, confirmation: { gmail_id: r.id, thread_id: r.threadId, label_ids: r.labelIds, message_id_header: messageId } };
  },
  async findSent(key) {
    const messageId = `<${key.replace(/[^a-zA-Z0-9]/g, '-')}@demian-os>`;
    const r = await g('GET', `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`rfc822msgid:${messageId}`)}&includeSpamTrash=false`);
    return r.messages?.[0] ? { external_id: r.messages[0].id, confirmation: { gmail_id: r.messages[0].id, verified_by: 'rfc822msgid' } } : null;
  },
  calendarList: () => g('GET', 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10'),
  listEvents: (calendarId = 'primary', timeMin, timeMax) =>
    g('GET', `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`),
  async createEvent(p, key) {
    const body = {
      summary: p.summary, description: p.description, location: p.location,
      start: { dateTime: p.start, timeZone: p.timezone || 'America/Argentina/Buenos_Aires' },
      end: { dateTime: p.end, timeZone: p.timezone || 'America/Argentina/Buenos_Aires' },
      attendees: (p.attendees || []).map((email) => ({ email })),
      extendedProperties: { private: { demianOsKey: key } },
    };
    const r = await g('POST', `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(p.calendar_id || 'primary')}/events?sendUpdates=${p.send_invites ? 'all' : 'none'}`, body);
    return { external_id: r.id, confirmation: { event_id: r.id, html_link: r.htmlLink, status: r.status } };
  },
  async findEvent(p, key) {
    const r = await g('GET', `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(p.calendar_id || 'primary')}/events?privateExtendedProperty=${encodeURIComponent(`demianOsKey=${key}`)}`);
    const ev = r.items?.[0];
    return ev ? { external_id: ev.id, confirmation: { event_id: ev.id, html_link: ev.htmlLink, verified_by: 'extendedProperty' } } : null;
  },
  driveAbout: () => g('GET', 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress),storageQuota'),
  driveListImages: (folderId) =>
    g('GET', `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`)}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=100`),
  driveDownload: (fileId) => g('GET', `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, null, { raw: true }),
};
