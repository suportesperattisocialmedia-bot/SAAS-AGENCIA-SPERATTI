-- Migration 002 — sincronização do workspace e portal de aprovação do cliente (idempotente).

-- Um documento JSON por coleção do app (tarefas, métricas, ideias, calendário...).
-- "version" implementa controle de concorrência otimista: cada gravação informa a versão
-- que leu; se outro aparelho gravou antes, o servidor responde 409 e o app mescla.
CREATE TABLE IF NOT EXISTS workspace_documents (
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id, key)
);

-- Links de aprovação enviados ao cliente (sem conta). A busca é pelo hash do token;
-- o token em si fica criptografado (AES-256-GCM) só para o dono poder copiar o link de novo.
CREATE TABLE IF NOT EXISTS approval_links (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS approval_links_agency_client_idx ON approval_links (agency_id, client_id);

-- Histórico de decisões do cliente (auditoria).
CREATE TABLE IF NOT EXISTS approval_events (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES approval_links(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_events_link_idx ON approval_events (link_id, created_at DESC);

ALTER TABLE workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_events ENABLE ROW LEVEL SECURITY;

INSERT INTO schema_migrations (id) VALUES ('002_workspace_sync_portal') ON CONFLICT (id) DO NOTHING;
