-- Tabela para cache local dos públicos Meta
CREATE TABLE public.meta_audiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  meta_audience_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  subtype TEXT,
  approximate_count INTEGER DEFAULT 0,
  operation_status JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(client_id, meta_audience_id)
);

-- Tabela para histórico de uploads de leads
CREATE TABLE public.meta_audience_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_id UUID NOT NULL REFERENCES public.meta_audiences(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('add', 'remove', 'replace')),
  records_count INTEGER NOT NULL DEFAULT 0,
  records_received INTEGER,
  records_invalid INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID
);

-- Índices para performance
CREATE INDEX idx_meta_audiences_client_id ON public.meta_audiences(client_id);
CREATE INDEX idx_meta_audiences_company_id ON public.meta_audiences(company_id);
CREATE INDEX idx_meta_audience_uploads_audience_id ON public.meta_audience_uploads(audience_id);

-- Enable RLS
ALTER TABLE public.meta_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_audience_uploads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para meta_audiences
CREATE POLICY "Company members can view audiences"
ON public.meta_audiences FOR SELECT
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can create audiences"
ON public.meta_audiences FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can update audiences"
ON public.meta_audiences FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can delete audiences"
ON public.meta_audiences FOR DELETE
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

-- Políticas RLS para meta_audience_uploads
CREATE POLICY "Company members can view uploads"
ON public.meta_audience_uploads FOR SELECT
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can create uploads"
ON public.meta_audience_uploads FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can update uploads"
ON public.meta_audience_uploads FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

-- Trigger para updated_at
CREATE TRIGGER update_meta_audiences_updated_at
BEFORE UPDATE ON public.meta_audiences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();