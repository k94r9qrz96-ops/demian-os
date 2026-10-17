// Metricool. Según help.metricool.com (consultado 2026-10-17): la API solo está en planes Advanced y Custom,
// se autentica con el header X-Mc-Auth y cada llamada lleva userId y blogId. La ayuda no confirma que la API
// permita programar publicaciones; por eso la programación queda DESACTIVADA hasta verificarla con tu cuenta
// (METRICOOL_SCHEDULER_VERIFIED=1 y METRICOOL_SCHEDULER_PATH con el endpoint confirmado en app.metricool.com/resources/apidocs).
import { config } from '../config.js';
import { redact } from '../lib/util.js';

export const metricoolConfigured = () => !!(config.metricool.token && config.metricool.userId);

async function m(method, path, body) {
  if (!metricoolConfigured()) throw Object.assign(new Error('Metricool no configurado (METRICOOL_API_TOKEN y METRICOOL_USER_ID)'), { noRetry: true });
  const sep = path.includes('?') ? '&' : '?';
  let res;
  try {
    res = await fetch(`${config.metricool.baseUrl}${path}${sep}userId=${encodeURIComponent(config.metricool.userId)}`, {
      method, headers: { 'X-Mc-Auth': config.metricool.token, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20_000),
    });
  } catch (e) { throw new Error(`Metricool no responde: ${redact(e.message)}`); }
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Metricool ${res.status}: ${redact(text.slice(0, 200))}`);
    err.status = res.status;
    if (res.status === 401 || res.status === 403) { err.code = 'insufficient_permissions'; err.noRetry = true; }
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

export const metricool = {
  test: () => m('GET', process.env.METRICOOL_TEST_PATH || '/api/admin/simpleProfiles'),
  async schedule(p) {
    if (process.env.METRICOOL_SCHEDULER_VERIFIED !== '1' || !process.env.METRICOOL_SCHEDULER_PATH)
      throw Object.assign(new Error('La programación por API de Metricool no está verificada para tu plan. Programala desde Metricool o confirmá el endpoint.'), { noRetry: true });
    const r = await m('POST', `${process.env.METRICOOL_SCHEDULER_PATH}?blogId=${encodeURIComponent(p.blog_id)}`, p.body);
    return { external_id: r.id ?? r.data?.id, confirmation: r };
  },
};
