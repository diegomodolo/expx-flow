-- Create client_status_rules table
CREATE TABLE IF NOT EXISTS public.client_status_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_order INTEGER NOT NULL,
  status_output TEXT NOT NULL CHECK (status_output IN ('excelente', 'atencao', 'emergencial', 'inativo', 'sem_fundos')),
  conditions JSONB NOT NULL DEFAULT '{"logic": "AND", "conditions": []}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, rule_order)
);

-- Enable RLS
ALTER TABLE public.client_status_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view rules"
  ON public.client_status_rules
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company admins can create rules"
  ON public.client_status_rules
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company admins can update non-default rules"
  ON public.client_status_rules
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company admins can delete non-default rules"
  ON public.client_status_rules
  FOR DELETE
  USING (
    is_default = false AND
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_client_status_rules_updated_at
  BEFORE UPDATE ON public.client_status_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_client_status_rules_company_order ON public.client_status_rules(company_id, rule_order) WHERE is_active = true;