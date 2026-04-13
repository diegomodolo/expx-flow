-- Armazena API keys de serviços externos por empresa (Pexels, Unsplash, etc.)
CREATE TABLE IF NOT EXISTS public.company_external_api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider     text NOT NULL,
  api_key      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider)
);

ALTER TABLE public.company_external_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage external api keys"
  ON public.company_external_api_keys
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.company_external_api_keys TO authenticated;

CREATE INDEX IF NOT EXISTS idx_company_ext_api_keys_company
  ON public.company_external_api_keys(company_id);
