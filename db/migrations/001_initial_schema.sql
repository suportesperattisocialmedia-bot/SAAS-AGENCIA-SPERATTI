-- GABRIEL SPERATTI | SOCIAL INTELLIGENCE
-- Migration 001 — schema inicial (idempotente, não apaga dados existentes).
-- Todas as entidades de negócio carregam agency_id para isolamento multi-tenant.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instagram_handle TEXT NOT NULL DEFAULT '',
  segment TEXT NOT NULL DEFAULT '',
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS clients_agency_idx ON clients (agency_id);

CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY,
  state_hash TEXT NOT NULL UNIQUE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta_instagram',
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS oauth_states_expires_idx ON oauth_states (expires_at);

CREATE TABLE IF NOT EXISTS instagram_connections (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  instagram_account_id TEXT NOT NULL,
  facebook_page_id TEXT,
  username TEXT,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'CONNECTED'
    CHECK (status IN ('CONNECTED', 'SYNCING', 'ERROR', 'EXPIRED', 'REAUTH_REQUIRED', 'DISCONNECTED')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS instagram_connections_client_unique ON instagram_connections (client_id);
CREATE INDEX IF NOT EXISTS instagram_connections_agency_idx ON instagram_connections (agency_id);

CREATE TABLE IF NOT EXISTS account_snapshots (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers INTEGER,
  follows INTEGER,
  media_count INTEGER,
  reach BIGINT,
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  saves BIGINT,
  profile_visits BIGINT,
  website_clicks BIGINT,
  posts_published INTEGER,
  engagement_rate NUMERIC(8, 4),
  source TEXT NOT NULL DEFAULT 'META_API',
  source_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'meta_instagram',
  media_type TEXT,
  format TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  permalink TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  likes INTEGER,
  comments INTEGER,
  reach INTEGER,
  views INTEGER,
  shares INTEGER,
  saves INTEGER,
  total_interactions INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider, external_id)
);
CREATE INDEX IF NOT EXISTS contents_client_published_idx ON contents (client_id, published_at DESC);

CREATE TABLE IF NOT EXISTS content_metric_snapshots (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  likes INTEGER,
  comments INTEGER,
  reach INTEGER,
  views INTEGER,
  shares INTEGER,
  saves INTEGER,
  total_interactions INTEGER,
  source TEXT NOT NULL DEFAULT 'META_API',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta_instagram',
  trigger TEXT NOT NULL DEFAULT 'MANUAL',
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'PARTIAL', 'ERROR')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  records_fetched INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  errors TEXT[] NOT NULL DEFAULT '{}',
  request_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_logs_client_idx ON sync_logs (client_id, started_at DESC);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output JSONB NOT NULL,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_analyses_client_idx ON ai_analyses (client_id, created_at DESC);

-- Entidades preparadas para a migração progressiva do armazenamento local para o servidor.
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instagram_handle TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  followers INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers INTEGER,
  posting_frequency_weekly NUMERIC(6, 2),
  avg_views INTEGER,
  avg_engagement_rate NUMERIC(8, 4),
  source TEXT NOT NULL,
  source_url TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competitor_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS research_runs (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_sources (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  research_run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence TEXT,
  confidence TEXT NOT NULL CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH'))
);

CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'IDEIA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_items (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payload JSONB NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabelas acessadas apenas pelo backend (service connection). Bloqueia a API REST pública
-- do Supabase (anon/authenticated) caso ela esteja habilitada no projeto.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agencies','users','clients','oauth_states','instagram_connections','account_snapshots',
    'contents','content_metric_snapshots','sync_logs','ai_analyses','competitors',
    'competitor_snapshots','research_runs','research_sources','content_ideas',
    'calendar_items','alerts','reports','schema_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

INSERT INTO schema_migrations (id) VALUES ('001_initial_schema') ON CONFLICT (id) DO NOTHING;
