-- Adicionar coluna de status aos leads
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'
CHECK (status IN ('open', 'qualified', 'unqualified', 'won', 'lost'));

-- Índice para busca eficiente
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);

-- Adicionar configuração de auto-mudança de status nas stages
ALTER TABLE crm_stages
ADD COLUMN IF NOT EXISTS auto_status_change BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS target_status TEXT CHECK (target_status IN ('open', 'qualified', 'unqualified', 'won', 'lost'));

-- Comentários para documentação
COMMENT ON COLUMN crm_stages.auto_status_change IS 'Se true, altera automaticamente o status do lead ao entrar nesta stage';
COMMENT ON COLUMN crm_stages.target_status IS 'Status que o lead deve assumir ao entrar nesta stage';
COMMENT ON COLUMN crm_leads.status IS 'Status do lead: open (aberto), qualified (qualificado), unqualified (não qualificado), won (ganho), lost (perdido)';