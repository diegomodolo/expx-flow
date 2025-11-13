-- Remove coluna desnecessária de cron_job_ids
ALTER TABLE automation_schedules 
DROP COLUMN IF EXISTS cron_job_ids;

-- Adicionar índice para otimizar consultas de agendamento
CREATE INDEX IF NOT EXISTS idx_automation_schedules_next_execution 
ON automation_schedules(next_execution_at) 
WHERE is_enabled = true;

-- Comentário sobre a nova arquitetura
COMMENT ON INDEX idx_automation_schedules_next_execution IS 'Otimiza busca de agendamentos prontos para execução pelo Cron Master';