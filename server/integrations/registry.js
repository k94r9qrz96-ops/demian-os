// Estado de integraciones con botón de prueba y proveedores de acciones externas.
import { execFileSync } from 'node:child_process';
import { config } from '../config.js';
import { q, j, nowIso } from '../db.js';
import { emit } from '../lib/events.js';
import { redact } from '../lib/util.js';
import { chatwoot, chatwootConfigured } from './chatwoot.js';
import { google, googleConfigured, googleGrantedScopes } from './google.js';
import { metricool, metricoolConfigured } from './metricool.js';
import { llmMode, createMessage, modelFor } from '../llm/anthropic.js';

// status: connected | pending_auth | insufficient_permissions | error | unavailable
const S = (status, detail, help) => ({ status, detail, help });

export const INTEGRATIONS = [
  {
    key: 'claude', name: 'Claude (API)', purpose: 'Interpretar pedidos, redactar y analizar',
    help: 'Creá una API key en console.anthropic.com → API Keys y cargala en Integraciones → Credenciales → Claude. Una suscripción a claude.ai no incluye acceso a la API.',
    async test() {
      const mode = llmMode();
      if (mode === 'no_configurado') return S('pending_auth', 'Falta ANTHROPIC_API_KEY');
      try {
        const r = await createMessage({ model: modelFor('light'), system: 'Respondé solo "ok".', messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 });
        return S('connected', `Responde (${mode}) · modelo ${modelFor('light')} · ${r.usage.input_tokens + r.usage.output_tokens} tokens`);
      } catch (e) {
        return S(e.data?.reason === 'llm_auth' ? 'insufficient_permissions' : 'error', redact(e.message));
      }
    },
  },
  {
    key: 'chatwoot', name: 'Chatwoot', purpose: 'Bandeja de conversaciones y puente con WhatsApp',
    help: 'Cargá URL, ID de cuenta, token de usuario, token del bot y secreto del webhook en Integraciones → Credenciales → Chatwoot. Ahí también está la URL del webhook para pegar en Chatwoot.',
    async test() {
      if (!chatwootConfigured()) return S('unavailable', 'Sin configurar');
      try {
        const p = await chatwoot.profile();
        return S('connected', `Cuenta: ${p.email || p.name || 'ok'}`);
      } catch (e) {
        return S(e.status === 401 || e.status === 403 ? 'insufficient_permissions' : 'error', redact(e.message));
      }
    },
  },
  {
    key: 'whatsapp', name: 'WhatsApp oficial (vía Chatwoot)', purpose: 'Recibir y enviar mensajes por la API oficial de Meta',
    help: 'Se conecta en Chatwoot como inbox "WhatsApp (Cloud API)". Tu número actual NO se migra automáticamente: leé docs/WHATSAPP.md (coexistencia) antes de decidir.',
    async test() {
      if (!chatwootConfigured() || !config.chatwoot.userToken) return S('unavailable', 'Requiere Chatwoot con token de usuario');
      try {
        const r = await chatwoot.inboxes();
        const wa = (r.payload || []).filter((i) => /whatsapp/i.test(i.channel_type || ''));
        if (!wa.length) return S('pending_auth', 'No hay inbox de WhatsApp en Chatwoot todavía');
        return S('connected', wa.map((i) => `#${i.id} ${i.name}${i.phone_number ? ` (${i.phone_number})` : ''}`).join(' · '));
      } catch (e) {
        return S('error', redact(e.message));
      }
    },
  },
  ...['gmail', 'calendar', 'drive'].map((svc) => ({
    key: `google_${svc}`, name: { gmail: 'Gmail', calendar: 'Google Calendar', drive: 'Google Drive' }[svc],
    purpose: { gmail: 'Enviar emails aprobados', calendar: 'Agendar entrevistas y reuniones aprobadas', drive: 'Importar fotos y documentos reales' }[svc],
    help: 'Creá un cliente OAuth (Web) en console.cloud.google.com, habilitá Gmail, Calendar y Drive API, pegá la URI de redirección que muestra Credenciales → Google, cargá Client ID y secret y tocá "Autorizar Google".',
    async test() {
      if (!googleConfigured()) return S('unavailable', 'Falta el cliente OAuth de Google');
      const scopes = googleGrantedScopes();
      if (!scopes.length) return S('pending_auth', 'Falta autorizar con tu cuenta de Google');
      const need = { gmail: 'gmail.send', calendar: 'calendar.events', drive: 'drive.readonly' }[svc];
      if (!scopes.some((s) => s.endsWith(need))) return S('insufficient_permissions', `Falta el permiso ${need}`);
      try {
        if (svc === 'gmail') { const p = await google.gmailProfile(); return S('connected', p.emailAddress); }
        if (svc === 'calendar') { const c = await google.calendarList(); return S('connected', `${c.items?.length || 0} calendarios`); }
        const d = await google.driveAbout(); return S('connected', d.user?.emailAddress || 'ok');
      } catch (e) {
        return S(e.code === 'pending_auth' ? 'pending_auth' : e.code === 'insufficient_permissions' ? 'insufficient_permissions' : 'error', redact(e.message));
      }
    },
  })),
  {
    key: 'metricool', name: 'Metricool', purpose: 'Programación y métricas de redes',
    help: 'La API requiere plan Advanced o Custom. Token en Metricool → Ajustes de cuenta → API; cargalo en Credenciales → Metricool.',
    async test() {
      if (!metricoolConfigured()) return S('unavailable', 'Sin token de API (requiere plan Advanced/Custom)');
      try { await metricool.test(); return S('connected', process.env.METRICOOL_SCHEDULER_VERIFIED === '1' ? 'Lectura y programación verificadas' : 'Lectura OK · programación sin verificar'); }
      catch (e) { return S(e.code === 'insufficient_permissions' ? 'insufficient_permissions' : 'error', redact(e.message)); }
    },
  },
  {
    key: 'transcription', name: 'Transcripción de audios', purpose: 'Convertir audios de WhatsApp en texto',
    help: 'No hay servicio de transcripción conectado. Los audios se registran y se derivan a una persona.',
    async test() { return config.transcription.provider ? S('error', `Proveedor ${config.transcription.provider} declarado pero sin implementar`) : S('unavailable', 'Sin proveedor conectado'); },
  },
  {
    key: 'video', name: 'Render de video (ffmpeg)', purpose: 'Exportar reels MP4 reproducibles',
    help: 'Incluido en la imagen Docker. Fuera de Docker instalá ffmpeg.',
    async test() {
      try { const v = execFileSync('ffmpeg', ['-version']).toString().split('\n')[0]; return S('connected', v.slice(0, 40)); }
      catch { return S('unavailable', 'ffmpeg no está instalado'); }
    },
  },
];

export async function testIntegration(key) {
  const def = INTEGRATIONS.find((i) => i.key === key);
  if (!def) throw Object.assign(new Error('Integración desconocida'), { statusCode: 404 });
  let r;
  try { r = await def.test(); } catch (e) { r = S('error', redact(e.message)); }
  const prev = q.get('SELECT status FROM integrations WHERE key = ?', key)?.status;
  q.run(`INSERT INTO integrations(key, status, detail, last_checked_at) VALUES (?,?,?,?)
         ON CONFLICT(key) DO UPDATE SET status = excluded.status, detail = excluded.detail, last_checked_at = excluded.last_checked_at`,
    key, r.status, r.detail, nowIso());
  if (r.status === 'error' && prev !== 'error') emit('integration.error', `${def.name}: ${r.detail}`, { level: 'error', agent_slug: 'monitor', data: { key } });
  if (prev === 'error' && r.status === 'connected') emit('integration.recovered', `${def.name} volvió a funcionar`, { level: 'success', agent_slug: 'monitor', data: { key } });
  return { key, name: def.name, purpose: def.purpose, ...r, help: r.help || def.help, last_checked_at: nowIso() };
}

export function integrationStatuses() {
  const rows = Object.fromEntries(q.all('SELECT key, status, detail, last_checked_at FROM integrations').map((r) => [r.key, r]));
  return INTEGRATIONS.map((d) => ({ key: d.key, name: d.name, purpose: d.purpose, help: d.help, status: rows[d.key]?.status || 'unavailable', detail: rows[d.key]?.detail || 'Sin probar', last_checked_at: rows[d.key]?.last_checked_at || null }));
}

export function isConnected(key) {
  return q.get('SELECT status FROM integrations WHERE key = ?', key)?.status === 'connected';
}

// ---- Proveedores de acciones externas (ejecutar + verificar antes de reintentar) ----
export const providers = {
  chatwoot_message: {
    name: 'Chatwoot',
    async execute(p) {
      const r = await chatwoot.sendMessage({ conversationId: p.conversation_id, content: p.content, isPrivate: false });
      if (p.local_conversation_id)
        q.run(`INSERT OR IGNORE INTO messages(conversation_id, external_id, direction, sender_type, content, delivery_status, origin) VALUES (?,?,?,?,?,?,?)`,
          p.local_conversation_id, String(r.id), 'out', 'bot', p.content, r.status || 'sent', 'demian_os');
      return { external_id: r.id, confirmation: { chatwoot_message_id: r.id, status: r.status, conversation_id: r.conversation_id, created_at: r.created_at }, delivery_status: r.status || null };
    },
    async verify(p, key, row) {
      const r = await chatwoot.listMessages(p.conversation_id);
      const since = Date.parse(String(row.created_at).replace(' ', 'T') + (String(row.created_at).endsWith('Z') ? '' : 'Z')) / 1000 - 10;
      const m = (r.payload || []).find((x) => (x.message_type === 1 || x.message_type === 'outgoing') && !x.private && x.content === p.content && x.created_at >= since);
      return m ? { external_id: m.id, confirmation: { chatwoot_message_id: m.id, status: m.status, verified_by: 'listado de mensajes' } } : null;
    },
  },
  gmail_send: {
    name: 'Gmail',
    execute: (p, key) => google.sendMail(p, key),
    verify: (p, key) => google.findSent(key),
  },
  calendar_event: {
    name: 'Google Calendar',
    execute: (p, key) => google.createEvent(p, key),
    verify: (p, key) => google.findEvent(p, key),
  },
  metricool_schedule: {
    name: 'Metricool',
    execute: (p) => metricool.schedule(p),
    async verify() { return null; },
  },
};

export function setProviderForTests(action, impl) { providers[action] = impl; }
