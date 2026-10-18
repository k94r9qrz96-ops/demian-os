// Configuración central. Todos los secretos vienen de variables de entorno del servidor;
// nunca se envían al frontend ni se escriben en registros.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv() {
  const file = process.env.DOTENV_PATH || path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

// Tolerar nombres cargados a mano con otra forma ("Admin_email", "admin-email", " ADMIN_EMAIL ").
for (const k of Object.keys(process.env)) {
  const norm = k.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (norm !== k && process.env[norm] === undefined) process.env[norm] = process.env[k];
}
// Si ADMIN_EMAIL no está con ese nombre, buscar otra variable de cuenta cuyo valor sea un email (p. ej. "ADMIN_MAIL", "EMAIL").
if (process.env.ADMIN_EMAIL === undefined) {
  const k = Object.keys(process.env).find((x) => /ADMIN|MAIL|CORREO|USUARIO|USER/i.test(x) && !/CHATWOOT|GOOGLE|METRICOOL|SMTP|GIT/i.test(x)
    && /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*$/.test(process.env[x] || ''));
  if (k) process.env.ADMIN_EMAIL = process.env[k];
}
if (process.env.ADMIN_PASSWORD === undefined) {
  const k = Object.keys(process.env).find((x) => /ADMIN.*(PASS|CLAVE|CONTRA)|^(PASSWORD|CONTRASE.*|CLAVE)$/i.test(x));
  if (k) process.env.ADMIN_PASSWORD = process.env[k];
}
for (const k of ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NAME']) if (process.env[k] !== undefined) process.env[k] = process.env[k].trim().replace(/^(["'`])(.*)\1$/, '$2');

const env = (k, d = undefined) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);
const num = (k, d) => (env(k) === undefined ? d : Number(env(k)));

const demo = env('DEMO_MODE') === '1';
// URL pública: explícita o detectada en Render / Railway
const detectedUrl = env('PUBLIC_URL') || env('RENDER_EXTERNAL_URL') || (env('RAILWAY_PUBLIC_DOMAIN') ? `https://${env('RAILWAY_PUBLIC_DOMAIN')}` : undefined);
const dataDir = path.resolve(env('DATA_DIR', path.join(root, 'data')));

export const config = {
  root,
  demo,
  port: num('PORT', 8787),
  host: env('HOST', '0.0.0.0'),
  publicUrl: (detectedUrl || 'http://localhost:8787').replace(/\/$/, ''),
  dataDir,
  // Producción y demostración usan bases separadas: los datos demo nunca tocan producción.
  dbPath: env('DB_PATH', path.join(dataDir, demo ? 'demo.sqlite' : 'demian-os.sqlite')),
  filesDir: env('FILES_DIR', path.join(dataDir, demo ? 'files-demo' : 'files')),
  sessionSecret: env('SESSION_SECRET'),
  encryptionKey: env('APP_ENCRYPTION_KEY'), // 32 bytes en base64 para cifrar tokens OAuth en reposo
  cookieSecure: env('COOKIE_SECURE', (detectedUrl || '').startsWith('https') ? '1' : '0') === '1',
  bootstrapAdmin: { email: env('ADMIN_EMAIL'), password: env('ADMIN_PASSWORD'), name: env('ADMIN_NAME', 'Demian') },

  anthropic: {
    apiKey: env('ANTHROPIC_API_KEY'),
    baseUrl: env('ANTHROPIC_API_BASE', 'https://api.anthropic.com'),
    directorModel: env('DIRECTOR_MODEL', 'claude-sonnet-5-5'),
    workerModel: env('WORKER_MODEL', 'claude-sonnet-5-5'),
    lightModel: env('LIGHT_MODEL', 'claude-haiku-5-5'),
    // USD por millón de tokens (fuente: platform.claude.com/docs/en/about-claude/pricing, consultado 2026-10-17)
    prices: {
      'claude-sonnet-5-5': { in: 2, out: 10 },
      'claude-haiku-5-5': { in: 0.1, out: 0.5 },
      'claude-opus-5-5': { in: 4, out: 20 },
    },
    webSearchPer1k: 10,
  },

  chatwoot: {
    baseUrl: env('CHATWOOT_BASE_URL'),
    accountId: env('CHATWOOT_ACCOUNT_ID'),
    userToken: env('CHATWOOT_USER_TOKEN'), // token de usuario administrador (lectura, cambio de estado)
    botToken: env('CHATWOOT_BOT_TOKEN'), // token del Agent Bot (respuestas)
    webhookSecret: env('CHATWOOT_WEBHOOK_SECRET'), // secreto HMAC del bot/webhook
    urlToken: env('CHATWOOT_URL_TOKEN'), // token adicional en la URL del webhook
    directorInboxId: env('CHATWOOT_DIRECTOR_INBOX_ID'),
    inboxCompanyMap: env('CHATWOOT_INBOX_COMPANY_MAP', ''), // "12:elite-hunters,13:rushy"
    replyDebounceMs: num('CHATWOOT_REPLY_DEBOUNCE_MS', 4000),
  },

  google: {
    clientId: env('GOOGLE_CLIENT_ID'),
    clientSecret: env('GOOGLE_CLIENT_SECRET'),
    redirectUri: env('GOOGLE_REDIRECT_URI', `${(detectedUrl || 'http://localhost:8787').replace(/\/$/, '')}/oauth/google/callback`),
  },

  metricool: {
    token: env('METRICOOL_API_TOKEN'),
    userId: env('METRICOOL_USER_ID'),
    baseUrl: env('METRICOOL_API_BASE', 'https://app.metricool.com'),
  },

  transcription: { provider: env('TRANSCRIPTION_PROVIDER') },

  worker: {
    concurrency: num('WORKER_CONCURRENCY', 3),
    pollMs: num('WORKER_POLL_MS', 400),
    defaultTimeoutMs: num('JOB_TIMEOUT_MS', 5 * 60_000),
    defaultMaxAttempts: num('JOB_MAX_ATTEMPTS', 3),
  },

  limits: {
    taskUsd: num('LIMIT_TASK_USD', 1.5),
    dailyUsd: num('LIMIT_DAILY_USD', 10),
    monthlyUsd: num('LIMIT_MONTHLY_USD', 120),
    alertRatio: num('LIMIT_ALERT_RATIO', 0.8),
    maxAgentTurns: num('MAX_AGENT_TURNS', 8),
  },
};

// Secretos internos (sesión y cifrado). Si no vienen del entorno se generan una sola vez y se guardan
// en el disco persistente del servidor (DATA_DIR/secrets.json, permisos 600). Así el despliegue no exige generarlos a mano.
export function ensureRuntimeSecrets() {
  const file = path.join(config.dataDir, 'secrets.json');
  let stored = {};
  try { stored = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  let changed = false;
  if (!config.sessionSecret) {
    if (!stored.sessionSecret) { stored.sessionSecret = crypto.randomBytes(48).toString('base64'); changed = true; }
    config.sessionSecret = stored.sessionSecret;
  }
  if (!config.encryptionKey) {
    if (!stored.encryptionKey) { stored.encryptionKey = crypto.randomBytes(32).toString('base64'); changed = true; }
    config.encryptionKey = stored.encryptionKey;
  } else if (Buffer.from(config.encryptionKey, 'base64').length !== 32) {
    // Cualquier valor provisto se normaliza a 32 bytes (p. ej. valores generados por el proveedor de hosting)
    config.encryptionKey = crypto.createHash('sha256').update(config.encryptionKey).digest('base64');
  }
  if (!process.env.SETUP_CODE) {
    if (!stored.setupCode) { stored.setupCode = crypto.randomBytes(5).toString('hex').toUpperCase(); changed = true; }
    config.setupCode = stored.setupCode;
  } else config.setupCode = process.env.SETUP_CODE.toUpperCase();
  if (changed) {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(stored), { mode: 0o600 });
  }
}

export function requireSecretsForProduction() {
  ensureRuntimeSecrets();
  return [];
}
