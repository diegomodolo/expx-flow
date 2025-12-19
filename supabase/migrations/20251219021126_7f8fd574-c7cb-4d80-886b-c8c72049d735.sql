-- Create campaign_presentations table for performance reports
CREATE TABLE public.campaign_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Cores e estilo
  primary_color TEXT DEFAULT '#1a73e8',
  secondary_color TEXT DEFAULT '#ffffff',
  
  -- Status e token público
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  public_token TEXT UNIQUE,
  
  -- Conteúdo gerado por IA
  executive_summary TEXT,
  action_plan TEXT,
  campaign_analyses JSONB DEFAULT '[]'::jsonb,
  
  -- Métricas snapshot (para preservar dados históricos)
  metrics_snapshot JSONB,
  
  -- Timestamps e contadores
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_presentations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view presentations from their company"
ON public.campaign_presentations
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create presentations in their company"
ON public.campaign_presentations
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update presentations in their company"
ON public.campaign_presentations
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete presentations in their company"
ON public.campaign_presentations
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

-- Public access for published presentations via token
CREATE POLICY "Anyone can view published presentations with token"
ON public.campaign_presentations
FOR SELECT
USING (
  status = 'published' AND public_token IS NOT NULL
);

-- Create indexes
CREATE INDEX idx_campaign_presentations_client_id ON public.campaign_presentations(client_id);
CREATE INDEX idx_campaign_presentations_company_id ON public.campaign_presentations(company_id);
CREATE INDEX idx_campaign_presentations_public_token ON public.campaign_presentations(public_token);
CREATE INDEX idx_campaign_presentations_status ON public.campaign_presentations(status);

-- Create trigger for updated_at
CREATE TRIGGER update_campaign_presentations_updated_at
BEFORE UPDATE ON public.campaign_presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();