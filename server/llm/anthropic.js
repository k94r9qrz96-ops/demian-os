// Cliente mínimo de la API de Claude (Messages API) sin SDK.
// Si falta ANTHROPIC_API_KEY, las tareas que lo necesitan quedan BLOQUEADAS con una explicación clara.
import { config } from '../config.js';
import { BlockedError, redact } from '../lib/util.js';

let override = null; // usado SOLO por pruebas simuladas (claramente marcadas)

export function setLlmProvider(fn) { override = fn; }
export function llmAvailable() { return !!override || !!config.anthropic.apiKey; }
export function llmMode() { return override ? 'simulado' : config.anthropic.apiKey ? 'real' : 'no_configurado'; }

export function modelFor(tier) {
  const a = config.anthropic;
  return tier === 'director' ? a.directorModel : tier === 'light' ? a.lightModel : a.workerModel;
}

/**
 * @param {{model:string, system:string, messages:any[], tools?:any[], maxTokens?:number, signal?:AbortSignal}} req
 * @returns {Promise<{content:any[], stop_reason:string, usage:{input_tokens:number, output_tokens:number, web_searches:number}}>}
 */
export async function createMessage(req) {
  if (override) return override(req);
  if (!config.anthropic.apiKey)
    throw new BlockedError('Falta conectar Claude: cargá ANTHROPIC_API_KEY como secreto del servidor (console.anthropic.com → API Keys).', { reason: 'llm_missing' });
  const body = {
    model: req.model,
    max_tokens: req.maxTokens ?? 4096,
    system: req.system,
    messages: req.messages,
    ...(req.tools?.length ? { tools: req.tools } : {}),
  };
  let res;
  try {
    res = await fetch(`${config.anthropic.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });
  } catch (e) {
    throw new Error(`No se pudo contactar a la API de Claude: ${redact(e.message)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`API de Claude respondió ${res.status}: ${redact(text.slice(0, 300))}`);
    if ([400, 401, 403, 404].includes(res.status)) err.noRetry = true;
    if (res.status === 401 || res.status === 403) throw new BlockedError(`Claude rechazó la credencial (${res.status}). Revisá ANTHROPIC_API_KEY.`, { reason: 'llm_auth' });
    throw err;
  }
  const data = JSON.parse(text);
  return {
    content: data.content,
    stop_reason: data.stop_reason,
    usage: {
      input_tokens: (data.usage?.input_tokens || 0) + (data.usage?.cache_creation_input_tokens || 0) + (data.usage?.cache_read_input_tokens || 0),
      output_tokens: data.usage?.output_tokens || 0,
      web_searches: data.usage?.server_tool_use?.web_search_requests || 0,
    },
  };
}

export const webSearchTool = (maxUses = 5) => ({ type: process.env.WEB_SEARCH_TOOL_TYPE || 'web_search_20250305', name: 'web_search', max_uses: maxUses });
