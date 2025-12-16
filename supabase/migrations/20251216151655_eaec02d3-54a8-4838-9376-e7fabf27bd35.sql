-- Add 'descartado' to the lead_classification check constraint
ALTER TABLE lead_master_pool DROP CONSTRAINT IF EXISTS lead_master_pool_lead_classification_check;

ALTER TABLE lead_master_pool ADD CONSTRAINT lead_master_pool_lead_classification_check 
  CHECK (lead_classification IN ('ouro', 'prata', 'bronze', 'descartado'));