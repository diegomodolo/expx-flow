-- Corrige os registros de histórico travados (in_progress há mais de 30 minutos sem conclusão)
UPDATE ad_generation_history
SET status = 'failed',
    error_message = 'Geração interrompida - timeout após execução incompleta'
WHERE id IN ('ffdb1fb0-1a0a-47a4-9534-647be1c22161', 'd8bf5240-f217-4331-98ac-75645bde0ab3')
  AND status = 'in_progress';