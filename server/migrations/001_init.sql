-- Demian OS · esquema inicial
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','viewer')),
  password_hash TEXT NOT NULL,
  whatsapp_phone TEXT,                  -- E.164 sin '+', p. ej. 5491122334455
  whatsapp_verified_at TEXT,
  whatsapp_verify_code TEXT,
  company_scope TEXT NOT NULL DEFAULT '*', -- '*' o lista JSON de slugs
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  disabled_at TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT
);

CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  ok INTEGER NOT NULL
);
CREATE INDEX login_attempts_key ON login_attempts(key, ts);

CREATE TABLE companies (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  handle TEXT,
  status TEXT NOT NULL DEFAULT 'activo',
  notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, name)
);

CREATE TABLE contacts (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  kind TEXT NOT NULL DEFAULT 'lead', -- lead | candidate | client_contact | company_contact | admin
  name TEXT,
  phone TEXT,
  email TEXT,
  chatwoot_contact_id TEXT,
  opt_in_at TEXT,          -- consentimiento registrado (fuente obligatoria)
  opt_in_source TEXT,
  opt_out_at TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX contacts_company ON contacts(company_id, client_id);
CREATE UNIQUE INDEX contacts_phone ON contacts(company_id, phone) WHERE phone IS NOT NULL;

CREATE TABLE agents (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  mode TEXT NOT NULL,                 -- llm | skill | hybrid
  instructions TEXT NOT NULL,
  tools TEXT NOT NULL DEFAULT '[]',   -- JSON
  permissions TEXT NOT NULL DEFAULT '{}',
  model_tier TEXT NOT NULL DEFAULT 'worker',
  avatar TEXT NOT NULL DEFAULT '{}',
  desk INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE instructions (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  company_id INTEGER REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  source TEXT NOT NULL DEFAULT 'app',  -- app | whatsapp
  source_ref TEXT,
  created_by INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'queued',
  plan TEXT,                            -- JSON del plan del director
  summary TEXT,
  attachments TEXT NOT NULL DEFAULT '[]',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  instruction_id INTEGER REFERENCES instructions(id),
  parent_id INTEGER REFERENCES tasks(id),
  company_id INTEGER REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  agent_slug TEXT NOT NULL REFERENCES agents(slug),
  kind TEXT NOT NULL DEFAULT 'agent',  -- agent | skill:<name> | consolidate
  title TEXT NOT NULL,
  input TEXT NOT NULL,                 -- instrucción para el agente
  params TEXT NOT NULL DEFAULT '{}',
  depends_on TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','waiting_approval','blocked','failed','completed','cancelled')),
  status_reason TEXT,
  result_summary TEXT,
  result TEXT,                          -- JSON
  sources TEXT NOT NULL DEFAULT '[]',   -- JSON [{type,ref,title,date}]
  cost_estimate_usd REAL NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  max_cost_usd REAL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  due_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  finished_at TEXT
);
CREATE INDEX tasks_status ON tasks(status);
CREATE INDEX tasks_agent ON tasks(agent_slug, status);
CREATE INDEX tasks_scope ON tasks(company_id, client_id);

CREATE TABLE runs (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL,                -- running | completed | failed | blocked | cancelled
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  model TEXT,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  web_searches INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  steps TEXT NOT NULL DEFAULT '[]',     -- evidencia: [{ts,type,tool,summary,ok}]
  error TEXT
);
CREATE INDEX runs_task ON runs(task_id);

CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'upload', -- upload | photo | audio | document | license_audio
  source TEXT NOT NULL DEFAULT 'app',   -- app | whatsapp | drive
  source_ref TEXT,
  license_note TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX files_scope ON files(company_id, client_id);

CREATE TABLE deliverables (
  id INTEGER PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id),
  instruction_id INTEGER REFERENCES instructions(id),
  company_id INTEGER REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  agent_slug TEXT,
  kind TEXT NOT NULL,                  -- markdown | video | image | json
  title TEXT NOT NULL,
  body TEXT,                           -- markdown/json inline
  file_path TEXT,
  mime TEXT,
  size INTEGER,
  sha256 TEXT,
  meta TEXT NOT NULL DEFAULT '{}',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX deliverables_scope ON deliverables(company_id, client_id);

CREATE TABLE approvals (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,           -- código corto para aprobar por WhatsApp
  task_id INTEGER REFERENCES tasks(id),
  company_id INTEGER REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  action TEXT NOT NULL,                -- chatwoot_message | gmail_send | calendar_event | metricool_schedule
  account TEXT NOT NULL,               -- cuenta/canal exacto
  recipient TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload TEXT NOT NULL,               -- JSON exacto que se ejecutará
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','executing','executed','failed','expired')),
  requested_by_agent TEXT,
  decided_by INTEGER REFERENCES users(id),
  decided_via TEXT,
  decided_at TEXT,
  decision_note TEXT,
  decision_snapshot TEXT,              -- copia exacta de lo aprobado
  executed_at TEXT,
  external_action_id INTEGER,
  error TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX approvals_status ON approvals(status);

CREATE TABLE external_actions (
  id INTEGER PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL,
  request TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','attempting','unknown','confirmed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  external_id TEXT,
  confirmation TEXT,                   -- respuesta verificable del proveedor
  delivery_status TEXT,                -- sent | delivered | read | failed (cuando aplica)
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  type TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',  -- info | success | warning | error
  company_id INTEGER,
  client_id INTEGER,
  agent_slug TEXT,
  task_id INTEGER,
  instruction_id INTEGER,
  message TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  notify INTEGER NOT NULL DEFAULT 0,
  read_at TEXT
);
CREATE INDEX events_ts ON events(id);
CREATE INDEX events_agent ON events(agent_slug, id);

CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed','cancelled','dead')),
  priority INTEGER NOT NULL DEFAULT 5,
  run_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 300000,
  lease_until TEXT,
  idempotency_key TEXT UNIQUE,
  cancel_requested INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  automation INTEGER NOT NULL DEFAULT 1, -- 1 = se detiene con la pausa general
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at TEXT
);
CREATE INDEX jobs_ready ON jobs(status, run_at, priority);

CREATE TABLE schedules (
  name TEXT PRIMARY KEY,
  every_minutes INTEGER NOT NULL,
  job_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT
);

CREATE TABLE memory_items (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  kind TEXT NOT NULL,                  -- instruction | tone | restriction | fact | document | public_info
  title TEXT,
  content TEXT NOT NULL,
  source TEXT NOT NULL,                -- quién/qué lo aportó (obligatorio)
  source_date TEXT NOT NULL,
  file_id INTEGER REFERENCES files(id),
  created_by INTEGER REFERENCES users(id),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX memory_scope ON memory_items(company_id, client_id, deleted_at);

CREATE TABLE integrations (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unavailable', -- connected | pending_auth | insufficient_permissions | error | unavailable
  detail TEXT,
  last_checked_at TEXT,
  tokens_enc TEXT,                     -- tokens OAuth cifrados (AES-256-GCM)
  meta TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE conversations (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'chatwoot',
  external_id TEXT NOT NULL,           -- id de conversación en Chatwoot
  account_id TEXT,
  inbox_id TEXT,
  company_id INTEGER REFERENCES companies(id),
  client_id INTEGER REFERENCES clients(id),
  contact_id INTEGER REFERENCES contacts(id),
  mode TEXT NOT NULL DEFAULT 'external', -- director | external
  admin_user_id INTEGER REFERENCES users(id),
  bot_paused INTEGER NOT NULL DEFAULT 0,
  paused_reason TEXT,
  paused_at TEXT,
  status TEXT,
  assigned_agent_slug TEXT,
  last_inbound_at TEXT,
  last_outbound_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, account_id, external_id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  external_id TEXT,
  direction TEXT NOT NULL,             -- in | out
  sender_type TEXT,                    -- contact | user | bot | system
  private INTEGER NOT NULL DEFAULT 0,
  content TEXT,
  attachments TEXT NOT NULL DEFAULT '[]',
  delivery_status TEXT,
  origin TEXT,                         -- demian_os | human | contact
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(conversation_id, external_id)
);
CREATE INDEX messages_conv ON messages(conversation_id, id);

CREATE TABLE webhook_receipts (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  payload_hash TEXT NOT NULL,
  outcome TEXT
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE spend_ledger (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  task_id INTEGER,
  provider TEXT NOT NULL,
  model TEXT,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  units INTEGER NOT NULL DEFAULT 0,
  usd REAL NOT NULL
);
CREATE INDEX spend_ts ON spend_ledger(ts);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  user_id INTEGER,
  via TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT NOT NULL DEFAULT '{}'
);

-- ===== Módulo de selección · Elite Hunters =====
CREATE TABLE rec_searches (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  hiring_company TEXT NOT NULL,
  hiring_contact_id INTEGER REFERENCES contacts(id),
  role_title TEXT NOT NULL,
  location TEXT,
  commercial_terms TEXT,               -- condiciones comerciales tal como se acordaron (texto)
  guarantee_days INTEGER,              -- permanencia acordada
  status TEXT NOT NULL DEFAULT 'abierta', -- abierta | en_pausa | cubierta | cerrada
  notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE rec_candidates (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  contact_id INTEGER REFERENCES contacts(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  location TEXT,
  summary TEXT,
  cv_file_id INTEGER REFERENCES files(id),
  videocv_file_id INTEGER REFERENCES files(id),
  consent_at TEXT,                     -- consentimiento para tratar datos y presentar
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE rec_applications (
  id INTEGER PRIMARY KEY,
  search_id INTEGER NOT NULL REFERENCES rec_searches(id),
  candidate_id INTEGER NOT NULL REFERENCES rec_candidates(id),
  stage TEXT NOT NULL DEFAULT 'postulado',
    -- postulado | preseleccion | entrevista_agendada | entrevistado | videocv | presentado | contratado | descartado
  ai_notes TEXT,                       -- sugerencias del agente (no decisión)
  human_decision TEXT,                 -- avanzar | descartar | en_espera (solo humano)
  human_decision_by INTEGER REFERENCES users(id),
  human_decision_at TEXT,
  human_decision_note TEXT,
  presented_at TEXT,
  hired_at TEXT,
  start_date TEXT,
  guarantee_until TEXT,
  guarantee_status TEXT,               -- en_curso | cumplida | caida
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(search_id, candidate_id)
);

CREATE TABLE rec_interviews (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES rec_applications(id),
  scheduled_at TEXT,
  interviewer TEXT,
  mode TEXT,                           -- presencial | videollamada | telefono
  calendar_event_id TEXT,              -- solo con confirmación de Google Calendar
  status TEXT NOT NULL DEFAULT 'propuesta', -- propuesta | agendada | realizada | cancelada | no_asistio
  notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
