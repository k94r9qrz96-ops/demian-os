import { config, requireSecretsForProduction, storageIsEphemeral } from './config.js';
import { openDb, closeDb } from './db.js';
import { seedCompanies, seedRoster } from './agents/roster.js';
import { ensureBootstrapAdmin } from './lib/auth.js';
import { startWorker, stopWorker } from './lib/queue.js';
import { registerJobs, startScheduler } from './worker.js';
import { buildApp } from './app.js';
import { seedDemo } from './demo.js';
import { applySecrets } from './lib/secrets.js';

async function main() {
  requireSecretsForProduction(); // genera y persiste secretos internos si faltan
  openDb();
  applySecrets(); // credenciales cargadas desde la app (cifradas)
  seedCompanies();
  seedRoster();
  if (config.demo) await seedDemo();
  const users = ensureBootstrapAdmin();
  registerJobs();
  startWorker();
  const sched = startScheduler();
  const app = await buildApp({ logger: { level: process.env.LOG_LEVEL || 'info' } });
  await app.listen({ port: config.port, host: config.host });
  console.log(`Demian OS ${config.demo ? '[DEMO — datos de demostración]' : ''} escuchando en ${config.publicUrl} (puerto ${config.port})`);
  // Plan gratis de Render: sin tráfico durante 15 min el servidor se duerme y, sin disco, se borra todo.
  // Un pedido liviano cada 10 min a la URL pública lo mantiene despierto (KEEP_AWAKE=0 lo desactiva).
  let awake = null;
  if (storageIsEphemeral() && /^https:/.test(config.publicUrl) && process.env.KEEP_AWAKE !== '0') {
    awake = setInterval(() => { fetch(`${config.publicUrl}/healthz`, { signal: AbortSignal.timeout(20_000) }).catch(() => {}); }, 10 * 60_000);
    awake.unref();
    console.log('Modo gratis sin disco: se mantiene despierto con un pedido cada 10 minutos.');
  }
  if (!users) console.log(`No hay usuarios. Abrí ${config.publicUrl} y usá el código de instalación: ${config.setupCode}`);
  const shutdown = async (sig) => {
    console.log(`${sig}: cerrando con orden…`);
    clearInterval(sched);
    if (awake) clearInterval(awake);
    await app.close();
    await stopWorker(); // los trabajos en curso que no terminen se recuperan al reiniciar (lease)
    closeDb();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => { console.error(e); process.exit(1); });
