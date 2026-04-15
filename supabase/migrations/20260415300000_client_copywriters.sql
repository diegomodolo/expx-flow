-- supabase/migrations/20260415300000_client_copywriters.sql

CREATE TABLE public.client_copywriters (
  client_id           uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tom_de_voz          text,
  publico_alvo        text,
  persona_marca       text,
  regras_de_copy      text,
  exemplos_aprovados  text,
  palavras_evitar     text,
  palavras_preferidas text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_copywriters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage client_copywriters"
  ON public.client_copywriters
  FOR ALL
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_copywriters TO authenticated;
