-- Adicionar coluna company_id à tabela offline_conversions
ALTER TABLE offline_conversions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_offline_conversions_company ON offline_conversions(company_id);

-- Atualizar registros existentes com company_id baseado no client_id
UPDATE offline_conversions oc
SET company_id = c.company_id
FROM clients c
WHERE oc.client_id = c.id
  AND oc.company_id IS NULL;