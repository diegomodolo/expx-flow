-- Tabela para log de requisições da API de leads
CREATE TABLE public.lead_api_request_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.company_api_keys(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('capture', 'conversion', 'update')),
  leads_processed INTEGER NOT NULL DEFAULT 1,
  source_info TEXT,
  capture_url TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'partial')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para filtros salvos de leads
CREATE TABLE public.lead_saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_config JSONB NOT NULL DEFAULT '{"conditions": [], "logic": "AND"}'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para histórico de importações de leads
CREATE TABLE public.lead_import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  leads_imported INTEGER NOT NULL DEFAULT 0,
  leads_duplicated INTEGER NOT NULL DEFAULT 0,
  leads_failed INTEGER NOT NULL DEFAULT 0,
  default_segment_id UUID REFERENCES public.lead_segments(id) ON DELETE SET NULL,
  imported_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_lead_api_request_log_company ON public.lead_api_request_log(company_id);
CREATE INDEX idx_lead_api_request_log_created ON public.lead_api_request_log(created_at DESC);
CREATE INDEX idx_lead_saved_filters_company ON public.lead_saved_filters(company_id);
CREATE INDEX idx_lead_import_history_company ON public.lead_import_history(company_id);
CREATE INDEX idx_lead_import_history_created ON public.lead_import_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.lead_api_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_import_history ENABLE ROW LEVEL SECURITY;

-- Policies para lead_api_request_log
CREATE POLICY "Company members can view API logs"
  ON public.lead_api_request_log FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "System can insert API logs"
  ON public.lead_api_request_log FOR INSERT
  WITH CHECK (true);

-- Policies para lead_saved_filters
CREATE POLICY "Company members can view saved filters"
  ON public.lead_saved_filters FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create saved filters"
  ON public.lead_saved_filters FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update saved filters"
  ON public.lead_saved_filters FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete saved filters"
  ON public.lead_saved_filters FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Policies para lead_import_history
CREATE POLICY "Company members can view import history"
  ON public.lead_import_history FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create import history"
  ON public.lead_import_history FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Trigger para atualizar updated_at em lead_saved_filters
CREATE TRIGGER update_lead_saved_filters_updated_at
  BEFORE UPDATE ON public.lead_saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();