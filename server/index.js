import { config, requireSecretsForProduction } from './config.js';
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
  if (!users && !config.bootstrapAdmin.email) console.log(`No hay usuarios. Abrí ${config.publicUrl} y usá el código de instalación: ${config.setupCode}`);
  const shutdown = async (sig) => {
    console.log(`${sig}: cerrando con orden…`);
    clearInterval(sched);
    await app.close();
    await stopWorker(); // los trabajos en curso que no terminen se recuperan al reiniciar (lease)
    closeDb();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => { console.error(e); process.exit(1); });
