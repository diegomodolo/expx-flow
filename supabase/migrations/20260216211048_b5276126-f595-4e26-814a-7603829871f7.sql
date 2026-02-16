-- Table for company-level usage defaults/rules
CREATE TABLE public.company_usage_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT 'true'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, setting_key)
);

ALTER TABLE public.company_usage_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company usage defaults"
  ON public.company_usage_defaults FOR SELECT
  USING (company_id IN (SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()));

CREATE POLICY "Users can insert their company usage defaults"
  ON public.company_usage_defaults FOR INSERT
  WITH CHECK (company_id IN (SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()));

CREATE POLICY "Users can update their company usage defaults"
  ON public.company_usage_defaults FOR UPDATE
  USING (company_id IN (SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()));

CREATE POLICY "Users can delete their company usage defaults"
  ON public.company_usage_defaults FOR DELETE
  USING (company_id IN (SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_company_usage_defaults_updated_at
  BEFORE UPDATE ON public.company_usage_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();