// Credenciales de integraciones cargadas desde la app (dueño), cifradas en la base con AES-256-GCM.
// Las variables de entorno del servidor tienen prioridad: si una clave está en el entorno, la app no la pisa.
// Los valores secretos nunca vuelven al frontend: solo se informa si están cargados y sus últimos 4 caracteres.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { q, j } from '../db.js';
import { encrypt, decrypt } from './util.js';

export const SECRET_DEFS = [
  { key: 'ANTHROPIC_API_KEY', group: 'claude', label: 'API key de Claude', secret: true, apply: (v) => { config.anthropic.apiKey = v; }, help: 'console.anthropic.com → API Keys. Requiere facturación de la API (la suscripción a claude.ai no la incluye).' },
  { key: 'CHATWOOT_BASE_URL', group: 'chatwoot', label: 'URL de Chatwoot', secret: false, apply: (v) => { config.chatwoot.baseUrl = v; }, help: 'Ej.: https://app.chatwoot.com o la URL de tu instancia.' },
  { key: 'CHATWOOT_ACCOUNT_ID', group: 'chatwoot', label: 'ID de cuenta', secret: false, apply: (v) => { config.chatwoot.accountId = v; }, help: 'Número que aparece en la URL de Chatwoot: /app/accounts/<ID>/…' },
  { key: 'CHATWOOT_USER_TOKEN', group: 'chatwoot', label: 'Token de usuario (administrador)', secret: true, apply: (v) => { config.chatwoot.userToken = v; }, help: 'Chatwoot → Perfil → Token de acceso.' },
  { key: 'CHATWOOT_BOT_TOKEN', group: 'chatwoot', label: 'Token del Agent Bot', secret: true, apply: (v) => { config.chatwoot.botToken = v; }, help: 'Chatwoot → Ajustes → Bots → tu bot → token.' },
  { key: 'CHATWOOT_WEBHOOK_SECRET', group: 'chatwoot', label: 'Secreto de firma del webhook', secret: true, apply: (v) => { config.chatwoot.webhookSecret = v; }, help: 'Se muestra al crear el bot o el webhook en Chatwoot.' },
  { key: 'CHATWOOT_URL_TOKEN', group: 'chatwoot', label: 'Token de la URL del webhook', secret: true, generate: true, apply: (v) => { config.chatwoot.urlToken = v; }, help: 'Generalo acá y usá la URL completa que te muestra la app.' },
  { key: 'CHATWOOT_INBOX_COMPANY_MAP', group: 'chatwoot', label: 'Inbox → empresa', secret: false, apply: (v) => { config.chatwoot.inboxCompanyMap = v; }, help: 'Ej.: 12:elite-hunters,13:rushy,14:yazak (el número es el ID del inbox).' },
  { key: 'CHATWOOT_DIRECTOR_INBOX_ID', group: 'chatwoot', label: 'Inbox exclusivo de dirección (opcional)', secret: false, apply: (v) => { config.chatwoot.directorInboxId = v; }, help: 'Si lo cargás, solo ese inbox acepta órdenes de tu número verificado.' },
  { key: 'GOOGLE_CLIENT_ID', group: 'google', label: 'Client ID de OAuth', secret: false, apply: (v) => { config.google.clientId = v; }, help: 'console.cloud.google.com → Credenciales → ID de cliente OAuth (aplicación web).' },
  { key: 'GOOGLE_CLIENT_SECRET', group: 'google', label: 'Client secret de OAuth', secret: true, apply: (v) => { config.google.clientSecret = v; }, help: 'Mismo lugar que el Client ID.' },
  { key: 'METRICOOL_API_TOKEN', group: 'metricool', label: 'Token de API', secret: true, apply: (v) => { config.metricool.token = v; }, help: 'Metricool → Ajustes de cuenta → API (plan Advanced o Custom).' },
  { key: 'METRICOOL_USER_ID', group: 'metricool', label: 'User ID', secret: false, apply: (v) => { config.metricool.userId = v; }, help: 'Aparece en la misma pantalla de API.' },
];

const fromEnv = (k) => process.env[k] !== undefined && process.env[k] !== '';

function load() {
  const row = q.get(`SELECT value FROM settings WHERE key = 'secrets_enc'`);
  if (!row) return {};
  try { return decrypt(j.parse(row.value)); } catch { return {}; }
}

export function applySecrets() {
  const stored = load();
  for (const d of SECRET_DEFS) if (!fromEnv(d.key) && stored[d.key]) d.apply(stored[d.key]);
}

export function listSecrets() {
  const stored = load();
  return SECRET_DEFS.map((d) => {
    const source = fromEnv(d.key) ? 'servidor' : stored[d.key] ? 'app' : null;
    const val = fromEnv(d.key) ? process.env[d.key] : stored[d.key];
    return { key: d.key, group: d.group, label: d.label, help: d.help, secret: d.secret, generate: !!d.generate, source,
      preview: !val ? null : d.secret ? `••••${String(val).slice(-4)}` : val };
  });
}

export function setSecret(key, value) {
  const def = SECRET_DEFS.find((d) => d.key === key);
  if (!def) throw Object.assign(new Error('Clave no admitida'), { statusCode: 400 });
  if (fromEnv(key)) throw Object.assign(new Error('Esta clave está definida en el servidor; cambiala ahí'), { statusCode: 409 });
  const stored = load();
  let v = typeof value === 'string' ? value.trim() : '';
  if (def.generate && v === '__generate__') v = crypto.randomBytes(24).toString('base64url');
  if (v.length > 4000) throw Object.assign(new Error('Valor demasiado largo'), { statusCode: 400 });
  if (v) stored[key] = v; else delete stored[key];
  q.run(`INSERT INTO settings(key, value, updated_at) VALUES ('secrets_enc', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, j.str(encrypt(stored)));
  def.apply(v || undefined);
  return listSecrets().find((s) => s.key === key);
}

export function webhookUrl() {
  return `${config.publicUrl}/webhooks/chatwoot${config.chatwoot.urlToken ? `/${config.chatwoot.urlToken}` : ''}`;
}
