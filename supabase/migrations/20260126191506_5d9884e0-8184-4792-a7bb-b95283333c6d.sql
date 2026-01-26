-- =====================================================
-- MÓDULO CUSTOMER SUCCESS - TABELAS PRINCIPAIS
-- =====================================================

-- 1. Configuração de Saúde do Cliente (Health Score 360)
CREATE TABLE public.client_health_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Metas do cliente
  target_roas NUMERIC(10,2) DEFAULT 3.0,
  target_cpl NUMERIC(10,2) DEFAULT 50.0,
  
  -- NPS
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  nps_collected_at TIMESTAMP WITH TIME ZONE,
  
  -- Contato CS
  last_cs_contact_at TIMESTAMP WITH TIME ZONE,
  cs_manager_id UUID REFERENCES auth.users(id),
  
  -- Status
  onboarding_status TEXT DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed')),
  churn_risk_level TEXT DEFAULT 'low' CHECK (churn_risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Health Scores (0-100)
  health_score_financial INTEGER DEFAULT 0 CHECK (health_score_financial >= 0 AND health_score_financial <= 100),
  health_score_operational INTEGER DEFAULT 0 CHECK (health_score_operational >= 0 AND health_score_operational <= 100),
  health_score_relational INTEGER DEFAULT 0 CHECK (health_score_relational >= 0 AND health_score_relational <= 100),
  health_score_total INTEGER DEFAULT 0 CHECK (health_score_total >= 0 AND health_score_total <= 100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(client_id)
);

-- 2. Milestones do Cliente (Jornada da Vitória)
CREATE TABLE public.client_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('onboarding', 'first_campaign', 'first_lead', 'monthly_goal', 'quarterly_goal', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'celebrated')),
  completed_at TIMESTAMP WITH TIME ZONE,
  celebrated_at TIMESTAMP WITH TIME ZONE,
  celebration_sent BOOLEAN DEFAULT false,
  celebration_method TEXT CHECK (celebration_method IN ('whatsapp', 'email', 'both')),
  
  metrics_snapshot JSONB,
  milestone_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Templates de Milestones
CREATE TABLE public.milestone_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  trigger_condition JSONB,
  celebration_message_template TEXT,
  
  is_active BOOLEAN DEFAULT true,
  template_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Touchpoints do Cliente
CREATE TABLE public.client_touchpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  touchpoint_type TEXT NOT NULL CHECK (touchpoint_type IN ('call', 'meeting', 'qbr', 'email', 'whatsapp')),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  summary TEXT,
  ai_summary TEXT,
  participants UUID[],
  
  next_action TEXT,
  next_action_date TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Relatórios QBR
CREATE TABLE public.qbr_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  metrics_snapshot JSONB,
  best_creatives UUID[],
  executive_summary TEXT,
  action_plan TEXT,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'presented', 'archived')),
  presented_at TIMESTAMP WITH TIME ZONE,
  
  public_token TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Respostas NPS
CREATE TABLE public.client_nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  trigger_type TEXT CHECK (trigger_type IN ('monthly', 'campaign_delivery', 'qbr')),
  
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_name TEXT,
  contact_email TEXT,
  
  follow_up_done BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Sugestões do Cliente
CREATE TABLE public.client_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('service', 'creative', 'communication', 'other')),
  
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'implemented', 'declined')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  admin_notes TEXT,
  
  submitted_by TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Comprovantes de Valor Mensal
CREATE TABLE public.value_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL,
  
  total_investment NUMERIC(12,2) DEFAULT 0,
  total_return NUMERIC(12,2) DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  best_campaign_id UUID REFERENCES public.campaigns(id),
  best_creative_id UUID REFERENCES public.ads(id),
  
  executive_summary TEXT,
  next_month_plan TEXT,
  
  public_token TEXT UNIQUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'approved')),
  
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(client_id, period_month, period_year)
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_client_health_config_client ON public.client_health_config(client_id);
CREATE INDEX idx_client_health_config_company ON public.client_health_config(company_id);
CREATE INDEX idx_client_health_config_risk ON public.client_health_config(churn_risk_level);
CREATE INDEX idx_client_health_config_score ON public.client_health_config(health_score_total);

CREATE INDEX idx_client_milestones_client ON public.client_milestones(client_id);
CREATE INDEX idx_client_milestones_company ON public.client_milestones(company_id);
CREATE INDEX idx_client_milestones_status ON public.client_milestones(status);

CREATE INDEX idx_client_touchpoints_client ON public.client_touchpoints(client_id);
CREATE INDEX idx_client_touchpoints_company ON public.client_touchpoints(company_id);
CREATE INDEX idx_client_touchpoints_occurred ON public.client_touchpoints(occurred_at DESC);

CREATE INDEX idx_qbr_reports_client ON public.qbr_reports(client_id);
CREATE INDEX idx_qbr_reports_company ON public.qbr_reports(company_id);
CREATE INDEX idx_qbr_reports_token ON public.qbr_reports(public_token);

CREATE INDEX idx_client_nps_responses_client ON public.client_nps_responses(client_id);
CREATE INDEX idx_client_nps_responses_score ON public.client_nps_responses(score);

CREATE INDEX idx_client_suggestions_client ON public.client_suggestions(client_id);
CREATE INDEX idx_client_suggestions_status ON public.client_suggestions(status);

CREATE INDEX idx_value_statements_client ON public.value_statements(client_id);
CREATE INDEX idx_value_statements_token ON public.value_statements(public_token);
CREATE INDEX idx_value_statements_period ON public.value_statements(period_year, period_month);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.client_health_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbr_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.value_statements ENABLE ROW LEVEL SECURITY;

-- Policies usando company_members (tabela correta do projeto)
CREATE POLICY "Users can view client health config from their company" 
ON public.client_health_config FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage client health config from their company" 
ON public.client_health_config FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view milestones from their company" 
ON public.client_milestones FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage milestones from their company" 
ON public.client_milestones FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view templates from their company" 
ON public.milestone_templates FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage templates from their company" 
ON public.milestone_templates FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view touchpoints from their company" 
ON public.client_touchpoints FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage touchpoints from their company" 
ON public.client_touchpoints FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view QBR reports from their company" 
ON public.qbr_reports FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage QBR reports from their company" 
ON public.qbr_reports FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Public can view QBR reports with valid token" 
ON public.qbr_reports FOR SELECT 
USING (public_token IS NOT NULL);

CREATE POLICY "Users can view NPS responses from their company" 
ON public.client_nps_responses FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage NPS responses from their company" 
ON public.client_nps_responses FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view suggestions from their company" 
ON public.client_suggestions FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage suggestions from their company" 
ON public.client_suggestions FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view value statements from their company" 
ON public.value_statements FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage value statements from their company" 
ON public.value_statements FOR ALL 
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Public can view value statements with valid token" 
ON public.value_statements FOR SELECT 
USING (public_token IS NOT NULL);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_client_health_config_updated_at
BEFORE UPDATE ON public.client_health_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_milestones_updated_at
BEFORE UPDATE ON public.client_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_milestone_templates_updated_at
BEFORE UPDATE ON public.milestone_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qbr_reports_updated_at
BEFORE UPDATE ON public.qbr_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_suggestions_updated_at
BEFORE UPDATE ON public.client_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_value_statements_updated_at
BEFORE UPDATE ON public.value_statements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();