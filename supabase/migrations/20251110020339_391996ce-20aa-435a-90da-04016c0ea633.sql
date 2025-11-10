-- Adicionar campos para temperatura automática na tabela crm_stages
ALTER TABLE crm_stages 
ADD COLUMN auto_temperature_change boolean DEFAULT false,
ADD COLUMN target_temperature text CHECK (target_temperature IN ('quente', 'morno', 'frio'));