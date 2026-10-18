// Respaldo y restauración: base SQLite (instantánea consistente con VACUUM INTO) + archivos subidos y generados.
// Las credenciales cifradas NO viajan en el respaldo: al restaurar se conservan las de este servidor.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { getDb, closeDb, openDb, q } from '../db.js';
import { stopWorker, startWorker } from './queue.js';
import { ensureBootstrapAdmin } from './auth.js';

function tmpDir(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

export function createBackup() {
  const dir = tmpDir('dos-backup-');
  const snap = path.join(dir, 'demian-os.sqlite');
  getDb().exec(`VACUUM INTO '${snap.replace(/'/g, "''")}'`);
  // Quitar credenciales cifradas de la copia (dependen de la clave de este servidor)
  const d = new DatabaseSync(snap);
  d.exec(`DELETE FROM settings WHERE key = 'secrets_enc'; UPDATE integrations SET status = 'pending_auth' WHERE tokens_enc IS NOT NULL; UPDATE integrations SET tokens_enc = NULL;`);
  d.close();
  const out = path.join(tmpDir('dos-backup-out-'), `demian-os-respaldo-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.tar.gz`);
  const args = ['-czf', out, '-C', dir, 'demian-os.sqlite'];
  if (fs.existsSync(config.filesDir)) args.push('-C', path.dirname(config.filesDir), path.basename(config.filesDir));
  execFileSync('tar', args);
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

export async function restoreBackup(archivePath) {
  const dir = tmpDir('dos-restore-');
  let stopped = false, restarted = false;
  try {
    // Listar primero: rechazar rutas absolutas o con ".."
    const list = execFileSync('tar', ['-tzf', archivePath]).toString().split('\n').filter(Boolean);
    if (list.some((p) => p.startsWith('/') || p.split('/').includes('..'))) throw new Error('Respaldo con rutas inválidas');
    if (!list.includes('demian-os.sqlite')) throw new Error('El archivo no es un respaldo de Demian OS');
    execFileSync('tar', ['-xzf', archivePath, '-C', dir, '--no-same-owner']);
    const snap = path.join(dir, 'demian-os.sqlite');
    const check = new DatabaseSync(snap, { readOnly: true });
    const ok = check.prepare(`SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name IN ('users','tasks','companies')`).get().c === 3;
    check.close();
    if (!ok) throw new Error('El archivo no es un respaldo de Demian OS');

    // Conservar credenciales de este servidor
    const keepSecrets = q.get(`SELECT value FROM settings WHERE key = 'secrets_enc'`)?.value ?? null;
    const keepTokens = q.all(`SELECT key, tokens_enc, status FROM integrations WHERE tokens_enc IS NOT NULL`);

    await stopWorker();
    stopped = true;
    closeDb();
    for (const sfx of ['', '-wal', '-shm']) fs.rmSync(config.dbPath + sfx, { force: true });
    fs.copyFileSync(snap, config.dbPath);
    const files = path.join(dir, path.basename(config.filesDir));
    if (fs.existsSync(files)) {
      fs.rmSync(config.filesDir, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(config.filesDir), { recursive: true });
      fs.cpSync(files, config.filesDir, { recursive: true });
    }
    openDb();
    q.run(`DELETE FROM settings WHERE key = 'secrets_enc'`);
    if (keepSecrets) q.run(`INSERT INTO settings(key, value) VALUES ('secrets_enc', ?)`, keepSecrets);
    q.run(`UPDATE integrations SET tokens_enc = NULL WHERE tokens_enc IS NOT NULL`);
    for (const t of keepTokens) q.run('UPDATE integrations SET tokens_enc = ?, status = ? WHERE key = ?', t.tokens_enc, t.status, t.key);
    ensureBootstrapAdmin(); // la cuenta del dueño sigue las variables del servidor
    // Los trabajos que estaban "en curso" al respaldar se recuperan solos (lease vencido)
    startWorker();
    restarted = true;
    return { tasks: q.get('SELECT COUNT(*) c FROM tasks').c, clients: q.get('SELECT COUNT(*) c FROM clients').c, files: q.get('SELECT COUNT(*) c FROM files').c };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    if (stopped && !restarted) { getDb(); startWorker(); }
  }
}
