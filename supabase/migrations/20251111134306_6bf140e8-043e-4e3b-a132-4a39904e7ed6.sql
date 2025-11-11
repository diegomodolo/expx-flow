-- ============================================
-- CAMPAIGN AUTOMATION SYSTEM - FULL IMPLEMENTATION
-- ============================================

-- Tabela principal de regras de automação
CREATE TABLE campaign_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Sistema de Templates
  is_template BOOLEAN DEFAULT false,
  template_id UUID REFERENCES campaign_automation_rules(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ,
  
  -- Identificação
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_order INTEGER NOT NULL DEFAULT 1,
  
  -- Objetivos permitidos (P1)
  campaign_objectives TEXT[], -- ['CONVERSIONS', 'LEAD_GENERATION', etc]
  
  -- Janela de tempo para análise (P0)
  time_window_days INTEGER DEFAULT 1,
  
  -- Condições
  conditions JSONB NOT NULL DEFAULT '{"logic": "AND", "conditions": []}'::jsonb,
  
  -- Tipo de ação
  action_type TEXT NOT NULL CHECK (action_type IN (
    'pause_campaign',
    'activate_campaign',
    'duplicate_campaign',
    'increase_budget',
    'decrease_budget',
    'pause_adset',
    'pause_ad',
    'notify_only',
    'duplicate_for_ab_test'
  )),
  
  -- Configuração da ação
  action_config JSONB DEFAULT '{}'::jsonb,
  
  -- Limites de segurança de orçamento (P0)
  budget_safety_limits JSONB DEFAULT '{
    "max_increase_percent": 50,
    "max_decrease_percent": 50,
    "min_daily_budget": 10,
    "max_daily_budget": 10000,
    "cooldown_hours": 24
  }'::jsonb,
  
  -- Limites de execução (P0)
  execution_limits JSONB DEFAULT '{
    "max_executions_per_campaign_per_day": 3,
    "prevent_flip_flop": true,
    "flip_flop_cooldown_hours": 12
  }'::jsonb,
  
  -- Filtros de escopo (P2)
  scope_filters JSONB DEFAULT '{
    "include_campaign_names": [],
    "exclude_campaign_names": [],
    "include_tags": [],
    "exclude_tags": [],
    "only_objectives": []
  }'::jsonb,
  
  -- Controle de execução
  is_active BOOLEAN DEFAULT true,
  last_execution_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Índices otimizados
CREATE INDEX idx_automation_rules_company ON campaign_automation_rules(company_id);
CREATE INDEX idx_automation_rules_client ON campaign_automation_rules(client_id);
CREATE INDEX idx_automation_rules_template ON campaign_automation_rules(is_template) WHERE is_template = true;
CREATE INDEX idx_automation_rules_active ON campaign_automation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_automation_rules_template_id ON campaign_automation_rules(template_id);

-- Constraint: Templates não podem ter client_id
ALTER TABLE campaign_automation_rules 
ADD CONSTRAINT check_template_no_client 
CHECK (
  (is_template = true AND client_id IS NULL) OR 
  (is_template = false)
);

-- Tabela de logs de execução
CREATE TABLE campaign_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES campaign_automation_rules(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Detalhes da ação
  action_type TEXT NOT NULL,
  action_result TEXT NOT NULL CHECK (action_result IN ('success', 'error', 'skipped')),
  error_message TEXT,
  
  -- Renomeação automática
  old_name TEXT,
  new_name TEXT,
  
  -- Orçamento (para rollback)
  old_budget NUMERIC,
  new_budget NUMERIC,
  
  -- Status (para rollback)
  old_status TEXT,
  new_status TEXT,
  
  -- Controle de rollback
  rolled_back BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID,
  
  -- Metadados
  metadata JSONB,
  
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_logs_rule ON campaign_automation_logs(rule_id);
CREATE INDEX idx_automation_logs_company ON campaign_automation_logs(company_id);
CREATE INDEX idx_automation_logs_client ON campaign_automation_logs(client_id);
CREATE INDEX idx_automation_logs_campaign ON campaign_automation_logs(campaign_id);
CREATE INDEX idx_automation_logs_executed ON campaign_automation_logs(executed_at DESC);
CREATE INDEX idx_automation_logs_rolled_back ON campaign_automation_logs(rolled_back) WHERE rolled_back = false;

-- Tabela de recomendações (modo notify_only)
CREATE TABLE campaign_automation_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES campaign_automation_rules(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Ação recomendada
  recommended_action TEXT NOT NULL,
  action_config JSONB,
  
  -- Contexto
  reason TEXT NOT NULL,
  conditions_met JSONB,
  campaign_data JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  
  -- Aprovação
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_notes TEXT,
  
  -- Execução
  executed_at TIMESTAMPTZ,
  execution_log_id UUID REFERENCES campaign_automation_logs(id),
  
  -- Expiração
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_recommendations_rule ON campaign_automation_recommendations(rule_id);
CREATE INDEX idx_automation_recommendations_status ON campaign_automation_recommendations(status);
CREATE INDEX idx_automation_recommendations_company ON campaign_automation_recommendations(company_id);
CREATE INDEX idx_automation_recommendations_expires ON campaign_automation_recommendations(expires_at);

-- Tabela de testes A/B
CREATE TABLE campaign_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES campaign_automation_rules(id) ON DELETE SET NULL,
  
  -- Campanhas do teste
  control_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  variant_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Configuração do teste
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL, -- 'budget', 'creative', 'audience'
  variation_config JSONB NOT NULL,
  
  -- Período
  started_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_end_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled')),
  
  -- Resultado
  winner TEXT, -- 'control', 'variant', 'inconclusive'
  winner_determined_at TIMESTAMPTZ,
  performance_summary JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_company ON campaign_ab_tests(company_id);
CREATE INDEX idx_ab_tests_client ON campaign_ab_tests(client_id);
CREATE INDEX idx_ab_tests_status ON campaign_ab_tests(status);
CREATE INDEX idx_ab_tests_control ON campaign_ab_tests(control_campaign_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- campaign_automation_rules
ALTER TABLE campaign_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view templates"
  ON campaign_automation_rules FOR SELECT
  USING (
    is_template = true 
    AND company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can view client rules"
  ON campaign_automation_rules FOR SELECT
  USING (
    is_template = false 
    AND company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates"
  ON campaign_automation_rules FOR ALL
  USING (
    is_template = true
    AND company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can manage client rules"
  ON campaign_automation_rules FOR ALL
  USING (
    is_template = false
    AND company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- campaign_automation_logs
ALTER TABLE campaign_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view automation logs"
  ON campaign_automation_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can update logs for rollback"
  ON campaign_automation_logs FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- campaign_automation_recommendations
ALTER TABLE campaign_automation_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view recommendations"
  ON campaign_automation_recommendations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can update recommendations"
  ON campaign_automation_recommendations FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- campaign_ab_tests
ALTER TABLE campaign_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view AB tests"
  ON campaign_ab_tests FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can manage AB tests"
  ON campaign_ab_tests FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_rules_updated_at
  BEFORE UPDATE ON campaign_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_rules_updated_at();