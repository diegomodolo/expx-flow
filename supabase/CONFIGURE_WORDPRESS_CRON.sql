-- =====================================================
-- CONFIGURAÇÃO DO CRON JOB PARA PUBLICAÇÃO DE POSTS WORDPRESS
-- =====================================================
-- Este script configura um CRON job que executa a cada minuto
-- para verificar e publicar posts automáticos do WordPress
-- =====================================================

-- 1. Garantir que as extensões necessárias estão habilitadas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover job existente (se houver) para evitar duplicatas
SELECT cron.unschedule('wordpress-auto-post-scheduler-job');

-- 3. Criar o CRON job que executa a cada minuto
SELECT cron.schedule(
  'wordpress-auto-post-scheduler-job',
  '* * * * *',  -- A cada minuto
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/wordpress-auto-post-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 4. Verificar se o job foi criado
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'wordpress-auto-post-scheduler-job';

-- =====================================================
-- COMANDOS ÚTEIS PARA GERENCIAMENTO
-- =====================================================

-- Listar todos os CRON jobs:
-- SELECT * FROM cron.job;

-- Pausar o job:
-- SELECT cron.alter_job('wordpress-auto-post-scheduler-job', active := false);

-- Reativar o job:
-- SELECT cron.alter_job('wordpress-auto-post-scheduler-job', active := true);

-- Remover o job completamente:
-- SELECT cron.unschedule('wordpress-auto-post-scheduler-job');

-- Ver histórico de execuções:
-- SELECT * FROM cron.job_run_details WHERE jobname = 'wordpress-auto-post-scheduler-job' ORDER BY start_time DESC LIMIT 20;

-- Testar manualmente (executar a função agora):
-- SELECT net.http_post(
--   url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/wordpress-auto-post-scheduler',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
--   ),
--   body := '{}'::jsonb
-- ) as request_id;
