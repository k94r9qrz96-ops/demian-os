-- Fichaje: vacantes con entrevistador IA propio y ranking automático de candidatos.
CREATE TABLE fichaje_vacancies (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  admin_key TEXT NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  salary TEXT,
  description TEXT NOT NULL,
  must_haves TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  kit TEXT NOT NULL,
  kit_source TEXT NOT NULL DEFAULT 'plantilla',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','fichaje','pro')),
  paid_at TEXT,
  closed_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE fichaje_candidates (
  id INTEGER PRIMARY KEY,
  vacancy_id INTEGER NOT NULL REFERENCES fichaje_vacancies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  answers TEXT NOT NULL,
  score INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  reasons TEXT NOT NULL,
  red_flags TEXT NOT NULL DEFAULT '[]',
  score_source TEXT NOT NULL DEFAULT 'reglas',
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_fichaje_cand_vac ON fichaje_candidates(vacancy_id, score DESC);
