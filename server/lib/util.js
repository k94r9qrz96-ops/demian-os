import crypto from 'node:crypto';
import { config } from '../config.js';
import { q, j } from '../db.js';

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
export const randomId = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');
export const shortCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.randomBytes(6)) s += alphabet[b % alphabet.length];
  return s;
};

export function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

// ---- Cifrado de secretos en reposo (tokens OAuth) ----
function key() {
  if (!config.encryptionKey) throw new Error('APP_ENCRYPTION_KEY no configurada');
  const k = Buffer.from(config.encryptionKey, 'base64');
  if (k.length !== 32) throw new Error('APP_ENCRYPTION_KEY debe tener 32 bytes en base64');
  return k;
}
export function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
export function decrypt(s) {
  const b = Buffer.from(s, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}

// ---- Ajustes ----
const DEFAULTS = {
  automations_paused: false,
  limits: null, // se completa con config.limits
  autonomy: {
    // Reglas que Demian configura. Por defecto TODO lo externo requiere aprobación.
    external_reply: { default: 'draft' }, // draft | auto | off  (atención a clientes/candidatos)
    director_ack: 'auto',                 // acuse de recibo a Demian en su canal verificado
    actions: {},                          // ej: { "chatwoot_message:rushy": "auto" }
  },
};
export function getSetting(k) {
  const r = q.get('SELECT value FROM settings WHERE key = ?', k);
  if (r) return j.parse(r.value);
  if (k === 'limits') return { ...config.limits };
  return structuredClone(DEFAULTS[k] ?? null);
}
export function setSetting(k, v) {
  q.run(`INSERT INTO settings(key, value, updated_at) VALUES (?,?,datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, k, j.str(v));
}

export function audit(userId, via, action, target, detail = {}) {
  q.run('INSERT INTO audit_log(user_id, via, action, target, detail) VALUES (?,?,?,?,?)', userId ?? null, via, action, target ?? null, j.str(detail));
}

// Elimina valores que parezcan secretos antes de guardar o mostrar errores.
export function redact(text) {
  if (!text) return text;
  let s = String(text);
  const secrets = [config.anthropic.apiKey, config.chatwoot.userToken, config.chatwoot.botToken, config.chatwoot.webhookSecret,
    config.google.clientSecret, config.metricool.token, config.sessionSecret].filter((x) => x && x.length > 6);
  for (const sec of secrets) s = s.split(sec).join('[secreto]');
  return s.replace(/(sk-ant-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, '$1…').replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[secreto]');
}

export class BlockedError extends Error {
  constructor(message, data = {}) { super(message); this.name = 'BlockedError'; this.data = data; }
}
export class PermissionError extends Error {
  constructor(message) { super(message); this.name = 'PermissionError'; this.statusCode = 403; }
}
