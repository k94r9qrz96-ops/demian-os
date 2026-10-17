// Datos de DEMOSTRACIÓN. Solo se cargan con DEMO_MODE=1, en una base separada (data/demo.sqlite).
// Todo queda marcado is_demo=1 y la interfaz muestra una franja "DEMO" permanente.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { q, nowIso, isoIn } from './db.js';
import { config } from './config.js';
import { createUser } from './lib/auth.js';

export async function seedDemo() {
  if (!config.demo) throw new Error('seedDemo solo corre en modo demo');
  if (q.get('SELECT COUNT(*) c FROM users').c > 0) return;
  createUser({ email: 'demo@demian-os.local', name: 'Demian (demo)', password: 'demo-demian-os', role: 'owner' });
  const co = (slug) => q.get('SELECT id FROM companies WHERE slug = ?', slug).id;
  const rushy = co('rushy');
  const eh = co('elite-hunters');
  const c1 = Number(q.run(`INSERT INTO clients(company_id, name, handle, notes, is_demo) VALUES (?,?,?,?,1)`, rushy, 'DEMO · Parrilla Ficticia', '@parrilla_demo', 'Cliente inventado para la demostración').lastInsertRowid);
  const c2 = Number(q.run(`INSERT INTO clients(company_id, name, handle, notes, is_demo) VALUES (?,?,?,?,1)`, rushy, 'DEMO · Café Ficticio', '@cafe_demo', 'Cliente inventado para la demostración').lastInsertRowid);
  const mem = (company, client, kind, title, content) => q.run(`INSERT INTO memory_items(company_id, client_id, kind, title, content, source, source_date, is_demo) VALUES (?,?,?,?,?,?,?,1)`, company, client, kind, title, content, 'Datos de demostración', nowIso().slice(0, 10));
  mem(rushy, c1, 'tone', 'Tono', 'Cercano, porteño, con humor sutil. Sin emojis en exceso.');
  mem(rushy, c1, 'restriction', 'Restricción', 'No publicar precios ni promociones sin confirmación del dueño.');
  mem(rushy, c2, 'tone', 'Tono', 'Cálido y prolijo. Frases cortas.');
  mem(eh, null, 'public_info', 'Cómo trabajamos', 'Elite Hunters selecciona vendedores con entrevistas humanas. Para postularte, enviá tu CV y una presentación breve.');
  // Fotos de demostración generadas (patrones, NO fotos de clientes reales)
  const dir = path.join(config.filesDir, 'uploads', String(rushy), String(c1));
  fs.mkdirSync(dir, { recursive: true });
  const sources = ['testsrc2=s=1600x1066', 'smptehdbars=s=1080x1350', 'mandelbrot=s=1200x1200', 'gradients=s=1080x1920:c0=0xC4553A:c1=0x2E1A12:x0=0:y0=0:x1=1080:y1=1920:nb_colors=2'];
  sources.forEach((src, i) => {
    const out = path.join(dir, `demo-${i + 1}.jpg`);
    try {
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', src, '-frames:v', '1', '-vf', `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='IMAGEN DEMO ${i + 1}':fontsize=64:fontcolor=white:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=(h-text_h)/2`, out]);
      const buf = fs.readFileSync(out);
      q.run(`INSERT INTO files(company_id, client_id, original_name, stored_path, mime, size, sha256, kind, source, is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)`, rushy, c1, `demo-${i + 1}.jpg`, out, 'image/jpeg', buf.length, crypto.createHash('sha256').update(buf).digest('hex'), 'photo', 'demo');
    } catch { /* sin ffmpeg: la demo sigue sin fotos */ }
  });
  // Selección demo
  const s = Number(q.run(`INSERT INTO rec_searches(company_id, hiring_company, role_title, location, commercial_terms, guarantee_days, is_demo) VALUES (?,?,?,?,?,?,1)`, eh, 'DEMO · Empresa Ficticia SA', 'Vendedor/a de salón', 'CABA', 'Condiciones de demostración (no reales)', 90).lastInsertRowid);
  const cand = (name, stage, consent) => {
    const id = Number(q.run(`INSERT INTO rec_candidates(company_id, full_name, location, consent_at, is_demo) VALUES (?,?,?,?,1)`, eh, name, 'CABA', consent ? nowIso() : null).lastInsertRowid);
    return Number(q.run(`INSERT INTO rec_applications(search_id, candidate_id, stage, is_demo) VALUES (?,?,?,1)`, s, id, stage).lastInsertRowid);
  };
  const a1 = cand('DEMO · Candidata Uno', 'entrevista_agendada', true);
  cand('DEMO · Candidato Dos', 'postulado', false);
  const a3 = cand('DEMO · Candidata Tres', 'entrevistado', true);
  q.run(`INSERT INTO rec_interviews(application_id, scheduled_at, mode, status, is_demo) VALUES (?,?,?,?,1)`, a1, isoIn(26 * 3600_000), 'presencial', 'agendada');
  q.run(`INSERT INTO rec_interviews(application_id, scheduled_at, mode, status, is_demo) VALUES (?,?,?,?,1)`, a3, isoIn(-48 * 3600_000), 'videollamada', 'realizada');
  // Conversación demo (no hay Chatwoot real en la demo)
  const ct = Number(q.run(`INSERT INTO contacts(company_id, client_id, kind, name, phone, is_demo) VALUES (?,?,?,?,?,1)`, rushy, null, 'lead', 'DEMO · Prospecto', '5490000000001').lastInsertRowid);
  const conv = Number(q.run(`INSERT INTO conversations(provider, external_id, account_id, inbox_id, company_id, contact_id, mode, last_inbound_at, is_demo) VALUES ('chatwoot','demo-1','demo','demo',?,?,'external',?,1)`, rushy, ct, isoIn(-5 * 3600_000)).lastInsertRowid);
  q.run(`INSERT INTO messages(conversation_id, external_id, direction, sender_type, content, origin, created_at) VALUES (?,?,?,?,?,?,?)`, conv, 'd1', 'in', 'contact', 'Hola, ¿hacen reels para restaurantes?', 'contact', isoIn(-5 * 3600_000));
  console.log('[demo] Datos de demostración cargados. Usuario: demo@demian-os.local / demo-demian-os');
}
