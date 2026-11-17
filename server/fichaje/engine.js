// Fichaje · motor: genera el kit de la vacante y puntúa candidatos.
// Con ANTHROPIC_API_KEY usa Claude; sin clave (o si se agota el presupuesto) usa reglas deterministas,
// así el producto funciona siempre y nunca deja a un cliente esperando.
import { createMessage, llmAvailable, modelFor } from '../llm/anthropic.js';
import { assertBudget, estimateUsd, recordSpend } from '../lib/spend.js';

const clean = (s, max = 4000) => String(s ?? '').replace(/\s+\n/g, '\n').trim().slice(0, max);
const lines = (s) => clean(s).split(/\n|;|•|·/).map((x) => x.replace(/^[-*\d.)\s]+/, '').trim()).filter((x) => x.length > 2);
const STOP = new Set('para con que los las del una uno por como más mas sus este esta tener tenés buscamos sobre entre desde hasta cada donde muy también trabajo puesto empresa equipo años experiencia'.split(' '));
export const keywords = (text) => [...new Set(String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-zñ0-9+#.]{4,}/g) || [])].filter((w) => !STOP.has(w));

// ---------- Kit de la vacante ----------

export function templateKit(v) {
  const must = lines(v.must_haves).slice(0, 3);
  const where = v.location ? ` en ${v.location}` : '';
  const pay = v.salary ? ` · ${v.salary}` : '';
  const desc = clean(v.description, 900);
  const questions = [
    ...must.map((m, i) => ({ id: `k${i + 1}`, type: 'knockout', text: `¿Cumplís con esto: “${m}”?`, expect: 'si', weight: 3 })),
    { id: 'disp', type: 'choice', text: '¿Cuándo podrías empezar?', options: ['Inmediato', 'En 15 días', 'En 30 días o más'], weight: 1 },
    { id: 'logro', type: 'open', text: `Contanos un logro concreto (con números si podés) que demuestre que harías bien el trabajo de ${v.title}.`, weight: 3 },
    { id: 'porque', type: 'open', text: `¿Por qué te interesa ${v.title} en ${v.company_name} y no otro puesto?`, weight: 2 },
    { id: 'sueldo', type: 'open', text: '¿Cuál es tu expectativa salarial?', weight: 1 },
  ];
  return {
    headline: `${v.company_name} busca ${v.title}${where}${pay}`,
    aviso: [
      `🔥 ${v.company_name} está fichando: ${v.title}${where}.`,
      v.salary ? `💰 ${v.salary}` : null,
      '',
      desc,
      must.length ? `\nLo que sí o sí necesitamos:\n${must.map((m) => `✅ ${m}`).join('\n')}` : null,
      '\nPostularte lleva 3 minutos y no hace falta CV: respondés unas preguntas y te contestamos rápido.',
    ].filter((x) => x !== null).join('\n'),
    reel: [
      { t: '0–3 s', screen: `¿Sos ${v.title}?`, voice: `Si sos ${v.title}, frená el scroll.` },
      { t: '3–8 s', screen: `${v.company_name} te quiere fichar${where}`, voice: `${v.company_name} está armando equipo${where}${v.salary ? ' y paga ' + v.salary : ''}.` },
      { t: '8–12 s', screen: must[0] ? `Clave: ${must[0]}` : 'Sin CV · 3 minutos', voice: must[0] ? `Buscamos a alguien con ${must[0]}.` : 'No necesitás CV: respondés 5 preguntas.' },
      { t: '12–15 s', screen: 'Postulate en el link 👇', voice: 'Entrá al link, respondé y te contestamos en días, no en meses.' },
    ],
    posts: {
      linkedin: `Estamos fichando ${v.title}${where} en ${v.company_name}.${pay ? ' ' + v.salary + '.' : ''}\n\nSin CV, sin formularios eternos: 5 preguntas y listo. Si conocés a alguien, etiquetalo 👇`,
      instagram: `🚨 ${v.company_name} busca ${v.title}${where}\n${must.map((m) => `✔️ ${m}`).join('\n')}\nPostulate en 3 minutos — link en bio`,
      whatsapp: `Hola! En ${v.company_name} buscamos ${v.title}${where}. Si te interesa (o conocés a alguien), postulate acá en 3 minutos:`,
    },
    questions,
    rubric: [
      'Cumple los requisitos excluyentes (si falla uno, queda descartado).',
      'Da ejemplos concretos y medibles, no frases genéricas.',
      'Su motivación encaja con el puesto y la empresa.',
      'Disponibilidad y expectativa salarial compatibles.',
    ],
  };
}

function validKit(k) {
  return k && typeof k.headline === 'string' && typeof k.aviso === 'string' && Array.isArray(k.reel) && k.posts && Array.isArray(k.questions)
    && k.questions.length >= 3 && k.questions.length <= 9 && k.questions.every((q) => q.id && q.text && ['knockout', 'open', 'choice'].includes(q.type));
}

function extractJson(text) {
  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; }
}

let llmCallsToday = { day: '', n: 0 };
function llmQuotaOk() {
  const day = new Date().toISOString().slice(0, 10);
  if (llmCallsToday.day !== day) llmCallsToday = { day, n: 0 };
  return llmCallsToday.n < Number(process.env.FICHAJE_LLM_DAILY || 300);
}

async function askClaude(tier, system, user, maxTokens) {
  if (!llmAvailable() || !llmQuotaOk()) return null;
  const model = modelFor(tier);
  try {
    assertBudget(null, estimateUsd(model, 3000, maxTokens));
    llmCallsToday.n++;
    const r = await createMessage({ model, system, messages: [{ role: 'user', content: user }], maxTokens, signal: AbortSignal.timeout(45_000) });
    recordSpend({ provider: 'anthropic', model, tokensIn: r.usage.input_tokens, tokensOut: r.usage.output_tokens, usd: estimateUsd(model, r.usage.input_tokens, r.usage.output_tokens) });
    return extractJson(r.content.filter((c) => c.type === 'text').map((c) => c.text).join(''));
  } catch { return null; }
}

const KIT_SYSTEM = `Sos el mejor reclutador y copywriter de Latinoamérica. Escribís en español rioplatense neutro, directo, sin clichés corporativos.
Devolvé SOLO un JSON válido con esta forma exacta:
{"headline": string (máx 90 caracteres),
 "aviso": string (aviso de empleo listo para publicar, 900-1400 caracteres, con emojis moderados, beneficios concretos, requisitos excluyentes con ✅ y un cierre que diga que postularse lleva 3 minutos y no requiere CV),
 "reel": [{"t":"0–3 s","screen":texto en pantalla corto,"voice":locución}] (4 a 5 escenas, 15-20 s en total, gancho fuerte en la primera),
 "posts": {"linkedin": string, "instagram": string, "whatsapp": string},
 "questions": [{"id": string corto, "type": "knockout"|"open"|"choice", "text": string, "expect": "si" (solo knockout), "options": [..] (solo choice), "weight": 1-3}] (5 a 7 preguntas: 1-3 knockout de requisitos excluyentes, 2-3 abiertas que obliguen a dar ejemplos concretos y verificables del oficio, 1 de disponibilidad tipo choice, 1 de expectativa salarial),
 "rubric": [4 criterios cortos para evaluar]}
No inventes sueldo ni beneficios que no estén en la descripción.`;

export async function generateKit(v) {
  const user = `Vacante:\nPuesto: ${v.title}\nEmpresa: ${v.company_name}\nUbicación/modalidad: ${v.location || '-'}\nSueldo: ${v.salary || 'no informado'}\nRequisitos excluyentes:\n${v.must_haves || '-'}\nDescripción:\n${clean(v.description, 3000)}`;
  const k = await askClaude('worker', KIT_SYSTEM, user, 2500);
  if (validKit(k)) {
    k.questions = k.questions.map((q, i) => ({ ...q, id: String(q.id || `q${i}`).replace(/[^a-z0-9_]/gi, '').slice(0, 20) || `q${i}`, weight: Math.min(3, Math.max(1, Number(q.weight) || 1)) }));
    return { kit: k, source: 'claude' };
  }
  return { kit: templateKit(v), source: 'plantilla' };
}

// ---------- Puntuación de candidatos ----------

export const VERDICTS = [
  { min: 75, label: 'Fichar ya' },
  { min: 55, label: 'Entrevistar' },
  { min: 35, label: 'En reserva' },
  { min: 0, label: 'Descartado' },
];
export const verdictFor = (score) => VERDICTS.find((x) => score >= x.min).label;
const isYes = (a) => /^(s[ií]|si\b|yes|claro|obvio|tengo|cumplo)/i.test(String(a || '').trim());

export function ruleScore(vacancy, kit, answers) {
  const reasons = []; const flags = [];
  const kw = keywords(`${vacancy.title} ${vacancy.description} ${vacancy.must_haves || ''}`);
  let pts = 0; let max = 0; let knockedOut = false;
  for (const q of kit.questions) {
    const a = clean(answers[q.id], 2000); const w = q.weight || 1; max += w * 10;
    if (q.type === 'knockout') {
      if (isYes(a)) { pts += w * 10; } else { knockedOut = true; flags.push(`No cumple: ${q.text.replace(/^¿Cumplís con esto: “|”\?$/g, '')}`); }
    } else if (q.type === 'choice') {
      const idx = (q.options || []).indexOf(a);
      pts += w * (idx === 0 ? 10 : idx === 1 ? 7 : idx >= 2 ? 4 : 0);
    } else {
      const words = a.split(/\s+/).filter(Boolean).length;
      if (/sueldo|salar/i.test(q.text)) { pts += w * (a ? 8 : 3); continue; }
      let s = Math.min(5, words / 8);
      if (/\d/.test(a)) { s += 2; }
      const hits = keywords(a).filter((x) => kw.includes(x));
      s += Math.min(3, hits.length);
      pts += w * Math.min(10, s);
      if (words < 6) flags.push(`Respuesta muy corta en: “${q.text.slice(0, 60)}…”`);
      else if (/\d/.test(a) && hits.length) reasons.push(`Da evidencia concreta y habla el idioma del puesto (${hits.slice(0, 3).join(', ')}).`);
    }
  }
  let score = Math.round((pts / Math.max(1, max)) * 100);
  if (knockedOut) score = Math.min(score, 30);
  if (!reasons.length && !knockedOut) reasons.push(score >= 55 ? 'Respuestas completas y alineadas con la vacante.' : 'Respuestas genéricas: falta evidencia concreta.');
  return { score, verdict: verdictFor(score), reasons: [...new Set(reasons)].slice(0, 3), red_flags: [...new Set(flags)].slice(0, 4), source: 'reglas' };
}

const SCORE_SYSTEM = `Sos un headhunter senior. Evaluás a un candidato SOLO con sus respuestas a una preselección.
Sé exigente: premiá evidencia concreta, medible y específica del oficio; castigá respuestas genéricas, copiadas o evasivas.
Si falla un requisito excluyente (knockout), el puntaje máximo es 30.
Devolvé SOLO JSON: {"score": 0-100, "reasons": [hasta 3 razones cortas a favor o en contra, en español], "red_flags": [hasta 3 alertas cortas]}.`;

export async function scoreCandidate(vacancy, kit, answers) {
  const base = ruleScore(vacancy, kit, answers);
  const qa = kit.questions.map((q) => `[${q.type}] ${q.text}\n→ ${clean(answers[q.id], 1500) || '(sin respuesta)'}`).join('\n\n');
  const r = await askClaude('light', SCORE_SYSTEM, `Puesto: ${vacancy.title} en ${vacancy.company_name}\nRequisitos: ${vacancy.must_haves || '-'}\nRúbrica: ${(kit.rubric || []).join(' | ')}\n\nRespuestas:\n${qa}`, 600);
  if (!r || !Number.isFinite(Number(r.score))) return base;
  let score = Math.max(0, Math.min(100, Math.round(Number(r.score))));
  if (base.red_flags.some((f) => f.startsWith('No cumple'))) score = Math.min(score, 30);
  const arr = (x) => (Array.isArray(x) ? x.map((s) => clean(s, 200)).filter(Boolean).slice(0, 3) : []);
  return { score, verdict: verdictFor(score), reasons: arr(r.reasons), red_flags: [...new Set([...base.red_flags.filter((f) => f.startsWith('No cumple')), ...arr(r.red_flags)])].slice(0, 4), source: 'claude' };
}
