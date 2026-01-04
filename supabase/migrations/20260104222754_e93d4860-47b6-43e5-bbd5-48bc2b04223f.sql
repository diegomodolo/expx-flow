-- Criar tabela para feed de atividades
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'creative_generated', 'task_completed', 'campaign_optimized', 'lead_captured', 'carousel_generated', 'alert_resolved', etc.
  entity_type TEXT NOT NULL, -- 'creative', 'task', 'campaign', 'lead', 'carousel', 'alert', etc.
  entity_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}', -- dados extras (imagem_url, cliente_name, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_activity_feed_company_id ON public.activity_feed(company_id);
CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_activity_type ON public.activity_feed(activity_type);

-- Enable RLS
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view activities from their company" 
ON public.activity_feed 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert activities for their company" 
ON public.activity_feed 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own activities" 
ON public.activity_feed 
FOR DELETE 
USING (user_id = auth.uid());

-- Função para registrar atividade automaticamente
CREATE OR REPLACE FUNCTION public.log_activity(
  p_company_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
    company_id,
    user_id,
    activity_type,
    entity_type,
    entity_id,
    title,
    description,
    metadata
  ) VALUES (
    p_company_id,
    p_user_id,
    p_activity_type,
    p_entity_type,
    p_entity_id,
    p_title,
    p_description,
    p_metadata
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;