// Crea un usuario dueño/administrador de forma segura (la contraseña se pide por consola, no queda en el historial).
import readline from 'node:readline';
import { openDb } from '../server/db.js';
import { seedCompanies, seedRoster } from '../server/agents/roster.js';
import { createUser } from '../server/lib/auth.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (qq, hidden = false) => new Promise((res) => {
  if (!hidden) return rl.question(qq, res);
  process.stdout.write(qq);
  const onData = (c) => { c = String(c); if (['\n', '\r', '\u0004'].includes(c)) process.stdin.off('data', onData); else process.stdout.write('\x1b[2K\x1b[200D' + qq + '*'.repeat(rl.line.length)); };
  process.stdin.on('data', onData);
  rl.question('', res);
});

openDb();
seedCompanies();
seedRoster();
const email = process.env.EMAIL || (await ask('Email: '));
const name = process.env.NAME || (await ask('Nombre: ')) || 'Demian';
const role = process.env.ROLE || 'owner';
const password = process.env.PASSWORD || (await ask('Contraseña (mín. 10): ', true));
try {
  const u = createUser({ email, name, password, role });
  console.log(`\nUsuario creado: ${u.email} (${u.role})`);
} catch (e) {
  console.error(`\nNo se pudo crear: ${e.message}`);
  process.exitCode = 1;
}
rl.close();
