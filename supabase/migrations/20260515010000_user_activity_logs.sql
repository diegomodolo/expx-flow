-- supabase/migrations/20260515010000_user_activity_logs.sql

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL,
  session_id    TEXT        NOT NULL,
  event_type    TEXT        NOT NULL
                CHECK (event_type IN ('page_view', 'action', 'login', 'logout')),
  page_path     TEXT,
  page_title    TEXT,
  module        TEXT,
  action_name   TEXT,
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB       DEFAULT '{}',
  duration_ms   INTEGER,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries comuns
CREATE INDEX idx_user_activity_logs_company_created
  ON public.user_activity_logs (company_id, created_at DESC);

CREATE INDEX idx_user_activity_logs_company_user
  ON public.user_activity_logs (company_id, user_id, created_at DESC);

CREATE INDEX idx_user_activity_logs_event_type
  ON public.user_activity_logs (company_id, event_type, created_at DESC);

-- RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Qualquer membro autenticado pode inserir logs para sua própria empresa.
-- Usa get_user_company_ids() (SECURITY DEFINER) para evitar subquery direta
-- em company_members (que tem RLS ativo).
CREATE POLICY "members_insert_activity_logs"
  ON public.user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    AND user_id = auth.uid()
  );

-- Apenas owners podem ler os logs da empresa.
-- Usa is_company_owner() (SECURITY DEFINER) para evitar subquery direta
-- em company_members (que tem RLS ativo).
CREATE POLICY "owners_select_activity_logs"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (
    is_company_owner(auth.uid(), company_id)
  );

-- GRANT obrigatório (sem isso frontend recebe array vazio sem erro)
GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;
