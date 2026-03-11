-- ================================================
-- AI Gateway: tabelas de configuração de modelos
-- ================================================

-- 1. Tabela de configuração de modelo por função por empresa
CREATE TABLE IF NOT EXISTS public.ai_model_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  primary_model text NOT NULL,
  fallback_model text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, function_name)
);

ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ai configs for their company"
  ON public.ai_model_configs FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert ai configs for their company"
  ON public.ai_model_configs FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update ai configs for their company"
  ON public.ai_model_configs FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete ai configs for their company"
  ON public.ai_model_configs FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_model_configs TO authenticated;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_model_configs_updated_at
  BEFORE UPDATE ON public.ai_model_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Tabela de modelos favoritos
CREATE TABLE IF NOT EXISTS public.ai_favorite_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, model_id)
);

ALTER TABLE public.ai_favorite_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view favorite models for their company"
  ON public.ai_favorite_models FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert favorite models for their company"
  ON public.ai_favorite_models FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete favorite models for their company"
  ON public.ai_favorite_models FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

GRANT SELECT, INSERT, DELETE ON public.ai_favorite_models TO authenticated;

-- 3. Tabela de API keys (RLS restritiva: apenas owners)
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  openrouter_api_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Apenas owners podem ler/editar API keys
CREATE POLICY "Owners can view api keys"
  ON public.ai_api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = ai_api_keys.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'owner'
    )
  );

CREATE POLICY "Owners can insert api keys"
  ON public.ai_api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = ai_api_keys.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'owner'
    )
  );

CREATE POLICY "Owners can update api keys"
  ON public.ai_api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = ai_api_keys.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'owner'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_api_keys TO authenticated;

CREATE TRIGGER ai_api_keys_updated_at
  BEFORE UPDATE ON public.ai_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
