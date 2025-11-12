-- Adicionar suporte a Recovery Triggers nos logs de automação
ALTER TABLE campaign_automation_logs
ADD COLUMN recovery_trigger_enabled BOOLEAN DEFAULT false,
ADD COLUMN recovery_trigger_days INTEGER,
ADD COLUMN recovery_scheduled_for TIMESTAMPTZ,
ADD COLUMN recovery_executed BOOLEAN DEFAULT false,
ADD COLUMN recovery_executed_at TIMESTAMPTZ,
ADD COLUMN recovery_log_id UUID REFERENCES campaign_automation_logs(id) ON DELETE SET NULL;

-- Criar índice para busca eficiente de logs pendentes de recovery
CREATE INDEX idx_automation_logs_recovery_pending 
ON campaign_automation_logs(recovery_scheduled_for) 
WHERE recovery_trigger_enabled = true 
  AND recovery_executed = false 
  AND action_result = 'success';

-- Comentários para documentação
COMMENT ON COLUMN campaign_automation_logs.recovery_trigger_enabled IS 'Se true, esta ação tem um gatilho de recuperação programado';
COMMENT ON COLUMN campaign_automation_logs.recovery_trigger_days IS 'Número de dias após execução para reativar';
COMMENT ON COLUMN campaign_automation_logs.recovery_scheduled_for IS 'Data/hora agendada para recovery (calculada automaticamente)';
COMMENT ON COLUMN campaign_automation_logs.recovery_executed IS 'Se true, o recovery já foi executado';
COMMENT ON COLUMN campaign_automation_logs.recovery_executed_at IS 'Quando o recovery foi executado';
COMMENT ON COLUMN campaign_automation_logs.recovery_log_id IS 'ID do log gerado pela ação de recovery';