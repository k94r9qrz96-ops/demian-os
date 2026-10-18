import crypto from 'node:crypto';
import { q, j, isoIn, nowIso } from '../db.js';
import { config } from '../config.js';
import { randomId, PermissionError } from './util.js';

const SESSION_DAYS = 30;

export function hashPassword(pw) {
  if (!pw || pw.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(pw, stored) {
  const [alg, s, h] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const hash = crypto.scryptSync(String(pw), Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(h, 'base64');
  return expected.length === hash.length && crypto.timingSafeEqual(expected, hash);
}

export function createUser({ email, name, password, role = 'admin', company_scope = '*' }) {
  const r = q.run('INSERT INTO users(email, name, role, password_hash, company_scope) VALUES (?,?,?,?,?)',
    email.toLowerCase().trim(), name, role, hashPassword(password), company_scope === '*' ? '*' : j.str(company_scope));
  return q.get('SELECT * FROM users WHERE id = ?', Number(r.lastInsertRowid));
}

export function ensureBootstrapAdmin() {
  const { email, password, name } = config.bootstrapAdmin;
  console.log(`[auth] Variables de cuenta: ADMIN_EMAIL ${email ? `= ${email.toLowerCase()}` : 'FALTA'}, ADMIN_PASSWORD ${password ? `cargada (${password.length} caracteres)` : 'FALTA'}`);
  if (email && password) {
    // Las variables del servidor mandan: si cambian, la cuenta del dueño se actualiza al arrancar.
    if (password.length < 10) console.log('[auth] ADMIN_PASSWORD tiene menos de 10 caracteres: no se usa.');
    else {
      const mail = email.toLowerCase().trim();
      const existing = q.get('SELECT * FROM users WHERE email = ?', mail);
      if (!existing) { createUser({ email: mail, name, password, role: 'owner' }); console.log(`[auth] Usuario dueño creado: ${mail}`); }
      else if (!verifyPassword(password, existing.password_hash) || existing.role !== 'owner' || existing.disabled_at) {
        q.run(`UPDATE users SET password_hash = ?, role = 'owner', disabled_at = NULL WHERE id = ?`, hashPassword(password), existing.id);
        console.log(`[auth] Contraseña del dueño actualizada desde ADMIN_PASSWORD: ${mail}`);
      }
    }
  }
  return q.get('SELECT COUNT(*) c FROM users').c;
}

function tooManyAttempts(key) {
  return q.get(`SELECT COUNT(*) c FROM login_attempts WHERE key = ? AND ok = 0 AND ts > datetime('now','-15 minutes')`, key).c >= 8;
}

export function login(email, password, meta = {}) {
  const key = `${String(email).toLowerCase()}|${meta.ip || ''}`;
  if (tooManyAttempts(key)) {
    const e = new Error('Demasiados intentos. Esperá 15 minutos.');
    e.statusCode = 429;
    throw e;
  }
  const user = q.get('SELECT * FROM users WHERE email = ? AND disabled_at IS NULL', String(email).toLowerCase().trim());
  const ok = !!user && (verifyPassword(password, user.password_hash) || (String(password) !== String(password).trim() && verifyPassword(String(password).trim(), user.password_hash)));
  q.run('INSERT INTO login_attempts(key, ok) VALUES (?,?)', key, ok ? 1 : 0);
  if (!ok) {
    const e = new Error('Email o contraseña incorrectos');
    e.statusCode = 401;
    throw e;
  }
  const id = randomId(32);
  q.run('INSERT INTO sessions(id, user_id, expires_at, user_agent, ip) VALUES (?,?,?,?,?)',
    id, user.id, isoIn(SESSION_DAYS * 86400_000), (meta.userAgent || '').slice(0, 200), meta.ip || null);
  return { sessionId: id, user: publicUser(user) };
}

export function sessionUser(sessionId) {
  if (!sessionId) return null;
  const row = q.get(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                     WHERE s.id = ? AND s.expires_at > ? AND u.disabled_at IS NULL`, sessionId, nowIso());
  return row || null;
}

export function logout(sessionId) {
  q.run('DELETE FROM sessions WHERE id = ?', sessionId);
}

export function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role,
    whatsapp_phone: u.whatsapp_phone, whatsapp_verified: !!u.whatsapp_verified_at,
    company_scope: u.company_scope === '*' ? '*' : j.parse(u.company_scope, []),
  };
}

// ---- Permisos por empresa ----
export function allowedCompanyIds(user) {
  const all = q.all('SELECT id, slug FROM companies');
  if (!user) return [];
  if (user.company_scope === '*' || user.role === 'owner') return all.map((c) => c.id);
  const slugs = j.parse(user.company_scope, []);
  return all.filter((c) => slugs.includes(c.slug)).map((c) => c.id);
}

export function assertCompanyAccess(user, companyId) {
  if (companyId === null || companyId === undefined) return;
  if (!allowedCompanyIds(user).includes(Number(companyId))) throw new PermissionError('Sin permiso sobre esta empresa');
}

export function assertCanAct(user) {
  if (!user || !['owner', 'admin'].includes(user.role)) throw new PermissionError('Tu usuario solo puede ver');
}
