-- Adicionar suporte multi-entidade às automações
-- Permite criar regras para campanhas, ad sets e criativos

-- 1. Adicionar coluna entity_type à tabela de regras
ALTER TABLE campaign_automation_rules 
ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'campaign' CHECK (entity_type IN ('campaign', 'adset', 'ad'));

-- 2. Adicionar colunas de referência aos logs
ALTER TABLE campaign_automation_logs
ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'campaign' CHECK (entity_type IN ('campaign', 'adset', 'ad')),
ADD COLUMN adset_id UUID REFERENCES ad_sets(id) ON DELETE SET NULL,
ADD COLUMN ad_id UUID REFERENCES ads(id) ON DELETE SET NULL;

-- 3. Criar índices para performance
CREATE INDEX idx_automation_rules_entity_type ON campaign_automation_rules(entity_type);
CREATE INDEX idx_automation_logs_entity_type ON campaign_automation_logs(entity_type);
CREATE INDEX idx_automation_logs_adset ON campaign_automation_logs(adset_id);
CREATE INDEX idx_automation_logs_ad ON campaign_automation_logs(ad_id);

-- 4. Atualizar comentários das colunas
COMMENT ON COLUMN campaign_automation_rules.entity_type IS 'Tipo de entidade: campaign (campanha), adset (conjunto de anúncios) ou ad (criativo)';
COMMENT ON COLUMN campaign_automation_logs.entity_type IS 'Tipo de entidade da ação executada';
COMMENT ON COLUMN campaign_automation_logs.adset_id IS 'ID do conjunto de anúncios (quando entity_type = adset)';
COMMENT ON COLUMN campaign_automation_logs.ad_id IS 'ID do criativo (quando entity_type = ad)';