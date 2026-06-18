-- Fixture: tabela companies com RLS usando get_user_company_ids + GRANT.
CREATE TABLE IF NOT EXISTS public.companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select_own" ON public.companies;
CREATE POLICY "companies_select_own" ON public.companies
  FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_company_ids(auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
