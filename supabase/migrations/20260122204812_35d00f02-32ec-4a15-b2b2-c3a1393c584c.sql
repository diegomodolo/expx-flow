-- Tabela para armazenar URLs de destino vinculadas a cada cliente
CREATE TABLE public.client_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  campaign_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(client_id, url)
);

-- Índices para performance
CREATE INDEX idx_client_urls_client_id ON public.client_urls(client_id);
CREATE INDEX idx_client_urls_domain ON public.client_urls(domain);
CREATE INDEX idx_client_urls_company_id ON public.client_urls(company_id);

-- Habilitar RLS
ALTER TABLE public.client_urls ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso usando company_members
CREATE POLICY "Users can view client URLs from their company"
ON public.client_urls FOR SELECT
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert client URLs for their company"
ON public.client_urls FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update client URLs from their company"
ON public.client_urls FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete client URLs from their company"
ON public.client_urls FOR DELETE
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Função para upsert de URL (usada pelas edge functions de sync)
CREATE OR REPLACE FUNCTION public.upsert_client_url(
  p_client_id UUID,
  p_company_id UUID,
  p_url TEXT,
  p_domain TEXT,
  p_source TEXT DEFAULT 'manual'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.client_urls (client_id, company_id, url, domain, source, first_seen_at, last_seen_at, campaign_count)
  VALUES (p_client_id, p_company_id, p_url, p_domain, p_source, NOW(), NOW(), 1)
  ON CONFLICT (client_id, url) 
  DO UPDATE SET 
    last_seen_at = NOW(),
    campaign_count = public.client_urls.campaign_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_client_urls_updated_at
BEFORE UPDATE ON public.client_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();