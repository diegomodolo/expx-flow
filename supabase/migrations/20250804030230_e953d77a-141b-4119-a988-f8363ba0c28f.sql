-- Sistema de Auditoria Completo para Análise de Impacto de Mudanças

-- 1. Tabela principal de auditoria de mudanças
CREATE TABLE public.change_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'campaign', 'ad_set', 'ad'
  entity_id UUID NOT NULL,
  change_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'status_change', 'budget_change', 'targeting_change', 'creative_change'
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[], -- array dos campos que mudaram
  changed_by UUID NOT NULL, -- user_id que fez a mudança
  change_source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'sync', 'automation'
  campaign_id UUID, -- para facilitar queries
  client_id UUID, -- para facilitar queries
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_period TEXT, -- período de sincronização se aplicável
  
  -- Índices para performance
  CONSTRAINT fk_change_audit_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_change_audit_user FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

-- 2. Tabela de snapshots de performance para análise temporal
CREATE TABLE public.performance_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'campaign', 'ad_set', 'ad'
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  campaign_id UUID,
  client_id UUID,
  
  -- Métricas de performance
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  
  -- Meta dados
  snapshot_date DATE NOT NULL,
  snapshot_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'sync_period'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT fk_performance_snapshots_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT unique_snapshot UNIQUE (entity_type, entity_id, snapshot_date, snapshot_period)
);

-- 3. Tabela de análise de impacto de mudanças
CREATE TABLE public.change_impact_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  change_log_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  client_id UUID NOT NULL,
  
  -- Período de análise
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  days_before_change INTEGER NOT NULL DEFAULT 7,
  days_after_change INTEGER NOT NULL DEFAULT 7,
  
  -- Métricas antes da mudança
  before_spend NUMERIC DEFAULT 0,
  before_conversions INTEGER DEFAULT 0,
  before_cpa NUMERIC DEFAULT 0,
  before_ctr NUMERIC DEFAULT 0,
  before_daily_avg_conversions NUMERIC DEFAULT 0,
  
  -- Métricas depois da mudança
  after_spend NUMERIC DEFAULT 0,
  after_conversions INTEGER DEFAULT 0,
  after_cpa NUMERIC DEFAULT 0,
  after_ctr NUMERIC DEFAULT 0,
  after_daily_avg_conversions NUMERIC DEFAULT 0,
  
  -- Variações calculadas
  conversion_improvement_pct NUMERIC DEFAULT 0,
  cpa_improvement_pct NUMERIC DEFAULT 0,
  ctr_improvement_pct NUMERIC DEFAULT 0,
  spend_efficiency_pct NUMERIC DEFAULT 0,
  
  -- Classificação do impacto
  impact_classification TEXT, -- 'positive', 'negative', 'neutral'
  impact_score NUMERIC DEFAULT 0, -- score calculado do impacto
  
  -- Meta dados
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_significant BOOLEAN DEFAULT false, -- se a mudança foi estatisticamente significativa
  confidence_level NUMERIC DEFAULT 0, -- nível de confiança da análise
  
  -- Constraints
  CONSTRAINT fk_change_impact_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_change_impact_log FOREIGN KEY (change_log_id) REFERENCES change_audit_log(id),
  CONSTRAINT unique_change_analysis UNIQUE (change_log_id, analysis_period_start, analysis_period_end)
);

-- 4. Tabela de versões de criativos para rastreamento detalhado
CREATE TABLE public.creative_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  ad_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  client_id UUID NOT NULL,
  
  -- Dados do criativo
  creative_title TEXT,
  creative_body TEXT,
  creative_description TEXT,
  call_to_action TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  creative_type TEXT,
  
  -- Versionamento
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  replaced_at TIMESTAMP WITH TIME ZONE,
  replaced_by UUID, -- user_id
  
  -- Meta dados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_reason TEXT, -- motivo da mudança
  performance_before_change JSONB, -- snapshot de performance antes da mudança
  
  -- Constraints
  CONSTRAINT fk_creative_versions_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_creative_versions_user FOREIGN KEY (replaced_by) REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_change_audit_company_date ON change_audit_log(company_id, created_at DESC);
CREATE INDEX idx_change_audit_entity ON change_audit_log(entity_type, entity_id);
CREATE INDEX idx_change_audit_campaign ON change_audit_log(campaign_id, created_at DESC);
CREATE INDEX idx_change_audit_client ON change_audit_log(client_id, created_at DESC);
CREATE INDEX idx_change_audit_type ON change_audit_log(change_type, created_at DESC);

CREATE INDEX idx_performance_snapshots_entity ON performance_snapshots(entity_type, entity_id, snapshot_date DESC);
CREATE INDEX idx_performance_snapshots_campaign ON performance_snapshots(campaign_id, snapshot_date DESC);
CREATE INDEX idx_performance_snapshots_client ON performance_snapshots(client_id, snapshot_date DESC);

CREATE INDEX idx_change_impact_company ON change_impact_analysis(company_id, calculated_at DESC);
CREATE INDEX idx_change_impact_campaign ON change_impact_analysis(campaign_id, calculated_at DESC);
CREATE INDEX idx_change_impact_score ON change_impact_analysis(impact_score DESC);

CREATE INDEX idx_creative_versions_ad ON creative_versions(ad_id, version_number DESC);
CREATE INDEX idx_creative_versions_current ON creative_versions(ad_id) WHERE is_current = true;

-- RLS Policies

-- Change Audit Log
ALTER TABLE public.change_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view change audit log" 
ON public.change_audit_log 
FOR SELECT 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can create change audit log" 
ON public.change_audit_log 
FOR INSERT 
WITH CHECK (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Performance Snapshots
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view performance snapshots" 
ON public.performance_snapshots 
FOR SELECT 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can create performance snapshots" 
ON public.performance_snapshots 
FOR INSERT 
WITH CHECK (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can update performance snapshots" 
ON public.performance_snapshots 
FOR UPDATE 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Change Impact Analysis
ALTER TABLE public.change_impact_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view change impact analysis" 
ON public.change_impact_analysis 
FOR SELECT 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can create change impact analysis" 
ON public.change_impact_analysis 
FOR INSERT 
WITH CHECK (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can update change impact analysis" 
ON public.change_impact_analysis 
FOR UPDATE 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Creative Versions
ALTER TABLE public.creative_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view creative versions" 
ON public.creative_versions 
FOR SELECT 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can create creative versions" 
ON public.creative_versions 
FOR INSERT 
WITH CHECK (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can update creative versions" 
ON public.creative_versions 
FOR UPDATE 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Funções auxiliares

-- Função para registrar mudanças automaticamente
CREATE OR REPLACE FUNCTION public.log_change_audit()
RETURNS TRIGGER AS $$
DECLARE
  _company_id UUID;
  _campaign_id UUID;
  _client_id UUID;
  _changed_fields TEXT[] := '{}';
  _field_name TEXT;
BEGIN
  -- Determinar company_id baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'campaigns' THEN
      _company_id := COALESCE(NEW.company_id, OLD.company_id);
      _campaign_id := COALESCE(NEW.id, OLD.id);
      _client_id := COALESCE(NEW.client_id, OLD.client_id);
    WHEN 'ad_sets' THEN
      _company_id := COALESCE(NEW.company_id, OLD.company_id);
      _campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);
      _client_id := COALESCE(NEW.client_id, OLD.client_id);
    WHEN 'ads' THEN
      _company_id := COALESCE(NEW.company_id, OLD.company_id);
      _campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);
      _client_id := COALESCE(NEW.client_id, OLD.client_id);
  END CASE;

  -- Para UPDATE, identificar campos que mudaram
  IF TG_OP = 'UPDATE' THEN
    -- Verificar campos específicos por tabela
    CASE TG_TABLE_NAME
      WHEN 'campaigns' THEN
        IF OLD.name != NEW.name THEN _changed_fields := array_append(_changed_fields, 'name'); END IF;
        IF OLD.status != NEW.status THEN _changed_fields := array_append(_changed_fields, 'status'); END IF;
        IF OLD.spend != NEW.spend THEN _changed_fields := array_append(_changed_fields, 'spend'); END IF;
        IF OLD.cpc != NEW.cpc THEN _changed_fields := array_append(_changed_fields, 'cpc'); END IF;
        IF OLD.ctr != NEW.ctr THEN _changed_fields := array_append(_changed_fields, 'ctr'); END IF;
        IF OLD.conversions != NEW.conversions THEN _changed_fields := array_append(_changed_fields, 'conversions'); END IF;
      WHEN 'ad_sets' THEN
        IF OLD.name != NEW.name THEN _changed_fields := array_append(_changed_fields, 'name'); END IF;
        IF OLD.status != NEW.status THEN _changed_fields := array_append(_changed_fields, 'status'); END IF;
        IF OLD.daily_budget != NEW.daily_budget THEN _changed_fields := array_append(_changed_fields, 'daily_budget'); END IF;
        IF OLD.targeting != NEW.targeting THEN _changed_fields := array_append(_changed_fields, 'targeting'); END IF;
      WHEN 'ads' THEN
        IF OLD.name != NEW.name THEN _changed_fields := array_append(_changed_fields, 'name'); END IF;
        IF OLD.status != NEW.status THEN _changed_fields := array_append(_changed_fields, 'status'); END IF;
        IF OLD.creative_title != NEW.creative_title THEN _changed_fields := array_append(_changed_fields, 'creative_title'); END IF;
        IF OLD.creative_body != NEW.creative_body THEN _changed_fields := array_append(_changed_fields, 'creative_body'); END IF;
        IF OLD.image_url != NEW.image_url THEN _changed_fields := array_append(_changed_fields, 'image_url'); END IF;
        IF OLD.video_url != NEW.video_url THEN _changed_fields := array_append(_changed_fields, 'video_url'); END IF;
    END CASE;
  END IF;

  -- Inserir log de auditoria
  INSERT INTO public.change_audit_log (
    company_id,
    entity_type,
    entity_id,
    change_type,
    old_values,
    new_values,
    changed_fields,
    changed_by,
    change_source,
    campaign_id,
    client_id
  ) VALUES (
    _company_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
    END,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    _changed_fields,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
    'sync', -- assumindo que a maioria das mudanças vem do sync
    _campaign_id,
    _client_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar snapshot de performance
CREATE OR REPLACE FUNCTION public.create_performance_snapshot(
  _entity_type TEXT,
  _entity_id UUID,
  _period TEXT DEFAULT 'daily'
)
RETURNS VOID AS $$
DECLARE
  _entity_record RECORD;
  _company_id UUID;
  _campaign_id UUID;
  _client_id UUID;
  _entity_name TEXT;
BEGIN
  -- Buscar dados da entidade baseado no tipo
  CASE _entity_type
    WHEN 'campaign' THEN
      SELECT * INTO _entity_record FROM campaigns WHERE id = _entity_id;
      _company_id := _entity_record.company_id;
      _campaign_id := _entity_record.id;
      _client_id := _entity_record.client_id;
      _entity_name := _entity_record.name;
    WHEN 'ad_set' THEN
      SELECT * INTO _entity_record FROM ad_sets WHERE id = _entity_id;
      _company_id := _entity_record.company_id;
      _campaign_id := _entity_record.campaign_id;
      _client_id := _entity_record.client_id;
      _entity_name := _entity_record.name;
    WHEN 'ad' THEN
      SELECT * INTO _entity_record FROM ads WHERE id = _entity_id;
      _company_id := _entity_record.company_id;
      _campaign_id := _entity_record.campaign_id;
      _client_id := _entity_record.client_id;
      _entity_name := _entity_record.name;
  END CASE;

  -- Inserir ou atualizar snapshot
  INSERT INTO public.performance_snapshots (
    company_id,
    entity_type,
    entity_id,
    entity_name,
    campaign_id,
    client_id,
    spend,
    impressions,
    clicks,
    conversions,
    reach,
    ctr,
    cpc,
    cpa,
    frequency,
    snapshot_date,
    snapshot_period
  ) VALUES (
    _company_id,
    _entity_type,
    _entity_id,
    _entity_name,
    _campaign_id,
    _client_id,
    COALESCE(_entity_record.spend, 0),
    COALESCE(_entity_record.impressions, 0),
    COALESCE(_entity_record.clicks, 0),
    COALESCE(_entity_record.conversions, 0),
    COALESCE(_entity_record.reach, 0),
    COALESCE(_entity_record.ctr, 0),
    COALESCE(_entity_record.cpc, 0),
    COALESCE(_entity_record.cpa, 0),
    COALESCE(_entity_record.frequency, 0),
    CURRENT_DATE,
    _period
  ) ON CONFLICT (entity_type, entity_id, snapshot_date, snapshot_period)
  DO UPDATE SET
    spend = EXCLUDED.spend,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    reach = EXCLUDED.reach,
    ctr = EXCLUDED.ctr,
    cpc = EXCLUDED.cpc,
    cpa = EXCLUDED.cpa,
    frequency = EXCLUDED.frequency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular impacto de mudanças
CREATE OR REPLACE FUNCTION public.calculate_change_impact(
  _change_log_id UUID,
  _days_before INTEGER DEFAULT 7,
  _days_after INTEGER DEFAULT 7
)
RETURNS VOID AS $$
DECLARE
  _change_record RECORD;
  _before_metrics RECORD;
  _after_metrics RECORD;
  _improvement_pct NUMERIC;
  _impact_score NUMERIC := 0;
  _impact_class TEXT := 'neutral';
BEGIN
  -- Buscar dados da mudança
  SELECT * INTO _change_record FROM change_audit_log WHERE id = _change_log_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular métricas antes da mudança
  SELECT 
    COALESCE(AVG(spend), 0) as avg_spend,
    COALESCE(AVG(conversions), 0) as avg_conversions,
    COALESCE(AVG(cpa), 0) as avg_cpa,
    COALESCE(AVG(ctr), 0) as avg_ctr,
    COALESCE(SUM(conversions), 0) as total_conversions
  INTO _before_metrics
  FROM performance_snapshots 
  WHERE entity_type = _change_record.entity_type 
    AND entity_id = _change_record.entity_id
    AND snapshot_date BETWEEN (_change_record.created_at::DATE - _days_before) AND _change_record.created_at::DATE;

  -- Calcular métricas depois da mudança  
  SELECT 
    COALESCE(AVG(spend), 0) as avg_spend,
    COALESCE(AVG(conversions), 0) as avg_conversions,
    COALESCE(AVG(cpa), 0) as avg_cpa,
    COALESCE(AVG(ctr), 0) as avg_ctr,
    COALESCE(SUM(conversions), 0) as total_conversions
  INTO _after_metrics
  FROM performance_snapshots 
  WHERE entity_type = _change_record.entity_type 
    AND entity_id = _change_record.entity_id
    AND snapshot_date BETWEEN _change_record.created_at::DATE AND (_change_record.created_at::DATE + _days_after);

  -- Calcular melhorias percentuais
  _improvement_pct := CASE 
    WHEN _before_metrics.avg_conversions > 0 THEN 
      ((_after_metrics.avg_conversions - _before_metrics.avg_conversions) / _before_metrics.avg_conversions) * 100
    ELSE 0 
  END;

  -- Calcular score de impacto (combinação de métricas)
  _impact_score := (
    CASE WHEN _before_metrics.avg_conversions > 0 THEN 
      ((_after_metrics.avg_conversions - _before_metrics.avg_conversions) / _before_metrics.avg_conversions) * 40
    ELSE 0 END +
    CASE WHEN _before_metrics.avg_cpa > 0 THEN 
      ((_before_metrics.avg_cpa - _after_metrics.avg_cpa) / _before_metrics.avg_cpa) * 30  -- melhoria no CPA
    ELSE 0 END +
    CASE WHEN _before_metrics.avg_ctr > 0 THEN 
      ((_after_metrics.avg_ctr - _before_metrics.avg_ctr) / _before_metrics.avg_ctr) * 30
    ELSE 0 END
  );

  -- Classificar impacto
  _impact_class := CASE 
    WHEN _impact_score > 10 THEN 'positive'
    WHEN _impact_score < -10 THEN 'negative'
    ELSE 'neutral'
  END;

  -- Inserir análise de impacto
  INSERT INTO public.change_impact_analysis (
    company_id,
    change_log_id,
    campaign_id,
    client_id,
    analysis_period_start,
    analysis_period_end,
    days_before_change,
    days_after_change,
    before_spend,
    before_conversions,
    before_cpa,
    before_ctr,
    after_spend,
    after_conversions,
    after_cpa,
    after_ctr,
    conversion_improvement_pct,
    impact_classification,
    impact_score,
    is_significant
  ) VALUES (
    _change_record.company_id,
    _change_log_id,
    _change_record.campaign_id,
    _change_record.client_id,
    _change_record.created_at::DATE - _days_before,
    _change_record.created_at::DATE + _days_after,
    _days_before,
    _days_after,
    _before_metrics.avg_spend,
    _before_metrics.avg_conversions,
    _before_metrics.avg_cpa,
    _before_metrics.avg_ctr,
    _after_metrics.avg_spend,
    _after_metrics.avg_conversions,
    _after_metrics.avg_cpa,
    _after_metrics.avg_ctr,
    _improvement_pct,
    _impact_class,
    _impact_score,
    ABS(_impact_score) > 15 -- significativo se score > 15%
  ) ON CONFLICT (change_log_id, analysis_period_start, analysis_period_end)
  DO UPDATE SET
    before_spend = EXCLUDED.before_spend,
    before_conversions = EXCLUDED.before_conversions,
    before_cpa = EXCLUDED.before_cpa,
    before_ctr = EXCLUDED.before_ctr,
    after_spend = EXCLUDED.after_spend,
    after_conversions = EXCLUDED.after_conversions,
    after_cpa = EXCLUDED.after_cpa,
    after_ctr = EXCLUDED.after_ctr,
    conversion_improvement_pct = EXCLUDED.conversion_improvement_pct,
    impact_classification = EXCLUDED.impact_classification,
    impact_score = EXCLUDED.impact_score,
    is_significant = EXCLUDED.is_significant,
    calculated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para auditoria automática
CREATE TRIGGER audit_campaigns_changes
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION log_change_audit();

CREATE TRIGGER audit_ad_sets_changes
  AFTER INSERT OR UPDATE OR DELETE ON ad_sets
  FOR EACH ROW EXECUTE FUNCTION log_change_audit();

CREATE TRIGGER audit_ads_changes
  AFTER INSERT OR UPDATE OR DELETE ON ads
  FOR EACH ROW EXECUTE FUNCTION log_change_audit();