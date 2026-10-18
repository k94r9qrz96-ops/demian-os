// Cola de trabajos durable sobre SQLite.
// - Deduplicación por idempotency_key (INSERT OR IGNORE).
// - Lease con vencimiento: si el proceso se reinicia, los trabajos "running" vencidos vuelven a la cola.
// - Reintentos limitados con backoff exponencial, tiempo máximo por trabajo y cancelación cooperativa.
// - Límite global de concurrencia y límites por tipo.
// - Pausa general: los trabajos marcados como automatización no se toman mientras esté activa.
import { q, j, nowIso, isoIn } from '../db.js';
import { config } from '../config.js';
import { getSetting, redact, BlockedError } from './util.js';
import { emit } from './events.js';

const handlers = new Map();
const perTypeLimits = new Map();
const running = new Map(); // jobId -> {controller, type}
let timer = null;
let stopping = false;

export function registerHandler(type, fn, { concurrency } = {}) {
  handlers.set(type, fn);
  if (concurrency) perTypeLimits.set(type, concurrency);
}

export function enqueue(type, payload = {}, opts = {}) {
  const {
    idempotencyKey = null, delayMs = 0, priority = 5, maxAttempts = config.worker.defaultMaxAttempts,
    timeoutMs = config.worker.defaultTimeoutMs, automation = true,
  } = opts;
  const r = q.run(
    `INSERT OR IGNORE INTO jobs(type, payload, priority, run_at, max_attempts, timeout_ms, idempotency_key, automation)
     VALUES (?,?,?,?,?,?,?,?)`,
    type, j.str(payload), priority, isoIn(delayMs), maxAttempts, timeoutMs, idempotencyKey, automation ? 1 : 0,
  );
  if (r.changes === 0) {
    const existing = q.get('SELECT * FROM jobs WHERE idempotency_key = ?', idempotencyKey);
    return { id: existing.id, duplicate: true };
  }
  kick();
  return { id: Number(r.lastInsertRowid), duplicate: false };
}

export function cancelJob(id) {
  q.run(`UPDATE jobs SET cancel_requested = 1, updated_at = ? WHERE id = ?`, nowIso(), id);
  q.run(`UPDATE jobs SET status = 'cancelled', finished_at = ? WHERE id = ? AND status = 'queued'`, nowIso(), id);
  running.get(id)?.controller.abort(new Error('cancelado'));
}

export function recoverStale() {
  // Trabajos cuyo lease venció (proceso caído/reiniciado) vuelven a la cola o mueren si agotaron intentos.
  const now = nowIso();
  const stale = q.all(`SELECT * FROM jobs WHERE status = 'running' AND lease_until < ?`, now);
  for (const job of stale) {
    if (running.has(job.id)) continue;
    if (job.attempts >= job.max_attempts) {
      q.run(`UPDATE jobs SET status = 'dead', last_error = ?, finished_at = ? WHERE id = ?`, 'Lease vencido sin más intentos', now, job.id);
      emit('job.dead', `Trabajo #${job.id} (${job.type}) agotó sus intentos tras un reinicio`, { level: 'error', data: { job_id: job.id } });
    } else {
      q.run(`UPDATE jobs SET status = 'queued', run_at = ?, updated_at = ? WHERE id = ?`, now, now, job.id);
      emit('job.recovered', `Trabajo #${job.id} (${job.type}) recuperado tras reinicio`, { level: 'warning', data: { job_id: job.id } });
    }
  }
  return stale.length;
}

function claimNext() {
  const paused = getSetting('automations_paused');
  const busyTypes = [...perTypeLimits.entries()]
    .filter(([t, lim]) => [...running.values()].filter((r) => r.type === t).length >= lim)
    .map(([t]) => t);
  const types = [...handlers.keys()].filter((t) => !busyTypes.includes(t));
  if (!types.length) return null;
  const placeholders = types.map(() => '?').join(',');
  const now = nowIso();
  const row = q.get(
    `SELECT * FROM jobs WHERE status = 'queued' AND run_at <= ? AND type IN (${placeholders})
     ${paused ? 'AND automation = 0' : ''}
     ORDER BY priority ASC, id ASC LIMIT 1`,
    now, ...types,
  );
  if (!row) return null;
  const upd = q.run(
    `UPDATE jobs SET status = 'running', attempts = attempts + 1, lease_until = ?, updated_at = ? WHERE id = ? AND status = 'queued'`,
    new Date(Date.now() + row.timeout_ms + 15_000).toISOString(), now, row.id,
  );
  if (upd.changes !== 1) return null;
  return q.get('SELECT * FROM jobs WHERE id = ?', row.id);
}

async function execute(job) {
  const handler = handlers.get(job.type);
  const controller = new AbortController();
  running.set(job.id, { controller, type: job.type });
  const timeout = setTimeout(() => controller.abort(new Error(`Tiempo máximo excedido (${Math.round(job.timeout_ms / 1000)} s)`)), job.timeout_ms);
  try {
    const payload = j.parse(job.payload, {});
    await Promise.race([
      handler(payload, { job, signal: controller.signal }),
      new Promise((_, rej) => controller.signal.addEventListener('abort', () => rej(controller.signal.reason), { once: true })),
    ]);
    q.run(`UPDATE jobs SET status = 'completed', finished_at = ?, lease_until = NULL, updated_at = ? WHERE id = ?`, nowIso(), nowIso(), job.id);
  } catch (err) {
    const cancelled = q.get('SELECT cancel_requested FROM jobs WHERE id = ?', job.id)?.cancel_requested === 1;
    const msg = redact(err?.message || String(err));
    if (cancelled) {
      q.run(`UPDATE jobs SET status = 'cancelled', last_error = ?, finished_at = ? WHERE id = ?`, msg, nowIso(), job.id);
    } else if (err instanceof BlockedError || err?.noRetry || job.attempts >= job.max_attempts) {
      q.run(`UPDATE jobs SET status = ?, last_error = ?, finished_at = ?, lease_until = NULL WHERE id = ?`,
        err instanceof BlockedError ? 'completed' : 'failed', msg, nowIso(), job.id);
      if (!(err instanceof BlockedError) && handler.onFinalFailure) await handler.onFinalFailure(j.parse(job.payload, {}), err, job);
    } else {
      const backoff = Math.min(60_000, 2000 * 2 ** (job.attempts - 1));
      q.run(`UPDATE jobs SET status = 'queued', last_error = ?, run_at = ?, lease_until = NULL, updated_at = ? WHERE id = ?`,
        msg, isoIn(backoff), nowIso(), job.id);
      emit('job.retry', `Reintento ${job.attempts}/${job.max_attempts} de ${job.type} en ${Math.round(backoff / 1000)} s: ${msg}`, { level: 'warning', data: { job_id: job.id } });
    }
  } finally {
    clearTimeout(timeout);
    running.delete(job.id);
    kick();
  }
}

function tick() {
  if (stopping) return;
  while (running.size < config.worker.concurrency) {
    const job = claimNext();
    if (!job) break;
    execute(job);
  }
}

export function kick() {
  if (timer && !stopping) setImmediate(tick);
}

let staleTimer = null;
export function startWorker() {
  if (timer) clearInterval(timer);
  stopping = false;
  recoverStale();
  timer = setInterval(() => {
    try {
      tick();
    } catch (e) {
      console.error('[worker]', redact(e.message));
    }
  }, config.worker.pollMs);
  if (!staleTimer) { staleTimer = setInterval(() => { try { recoverStale(); } catch {} }, 30_000); staleTimer.unref(); }
}

export async function stopWorker() {
  stopping = true;
  clearInterval(timer);
  timer = null;
  const deadline = Date.now() + 5000;
  while (running.size && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
}

export async function drain(timeoutMs = 20_000) {
  // Usado en pruebas: espera a que no queden trabajos listos ni en ejecución.
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    tick();
    const pending = q.get(`SELECT COUNT(*) c FROM jobs WHERE status IN ('queued','running') AND run_at <= ?`, isoIn(5000)).c;
    if (!pending && running.size === 0) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('drain: timeout');
}

export const queueStats = () => ({
  running: running.size,
  queued: q.get(`SELECT COUNT(*) c FROM jobs WHERE status = 'queued'`).c,
  failed24h: q.get(`SELECT COUNT(*) c FROM jobs WHERE status IN ('failed','dead') AND finished_at > ?`, isoIn(-86400000)).c,
});
