-- Adicionar colunas de métricas padrão na tabela company_settings
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS default_target_cpa NUMERIC,
ADD COLUMN IF NOT EXISTS default_target_cpl NUMERIC,
ADD COLUMN IF NOT EXISTS default_target_ctr NUMERIC,
ADD COLUMN IF NOT EXISTS default_target_cpc NUMERIC,
ADD COLUMN IF NOT EXISTS default_target_cpm NUMERIC,
ADD COLUMN IF NOT EXISTS default_target_roas NUMERIC,
ADD COLUMN IF NOT EXISTS default_target_frequency NUMERIC,
ADD COLUMN IF NOT EXISTS default_target_conversion_rate NUMERIC;