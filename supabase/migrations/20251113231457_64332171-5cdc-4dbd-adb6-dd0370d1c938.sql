-- Create automation rule templates table (grouping of multiple rules)
CREATE TABLE IF NOT EXISTS public.automation_rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create junction table for template-rule relationship
CREATE TABLE IF NOT EXISTS public.automation_template_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.automation_rule_templates(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.campaign_automation_rules(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, rule_id)
);

-- Enable RLS
ALTER TABLE public.automation_rule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_template_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_rule_templates
CREATE POLICY "Company members can view templates"
  ON public.automation_rule_templates
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can create templates"
  ON public.automation_rule_templates
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can update templates"
  ON public.automation_rule_templates
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can delete templates"
  ON public.automation_rule_templates
  FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- RLS Policies for automation_template_rules
CREATE POLICY "Company members can view template rules"
  ON public.automation_template_rules
  FOR SELECT
  USING (template_id IN (
    SELECT id FROM public.automation_rule_templates WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Company members can create template rules"
  ON public.automation_template_rules
  FOR INSERT
  WITH CHECK (template_id IN (
    SELECT id FROM public.automation_rule_templates WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Company members can delete template rules"
  ON public.automation_template_rules
  FOR DELETE
  USING (template_id IN (
    SELECT id FROM public.automation_rule_templates WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

-- Trigger for updated_at
CREATE TRIGGER update_automation_rule_templates_updated_at
  BEFORE UPDATE ON public.automation_rule_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_automation_rule_templates_company ON public.automation_rule_templates(company_id);
CREATE INDEX idx_automation_template_rules_template ON public.automation_template_rules(template_id);
CREATE INDEX idx_automation_template_rules_rule ON public.automation_template_rules(rule_id);