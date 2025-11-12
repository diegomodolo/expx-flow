-- ============================================================
-- CONFIGURAÇÃO DO CRON JOB PARA SNAPSHOTS DIÁRIOS
-- ============================================================
-- 
-- Este arquivo deve ser executado manualmente no SQL Editor do Supabase
-- para configurar o cron job que roda a função daily-performance-snapshot
-- todos os dias às 0h (horário de Brasília).
--
-- IMPORTANTE: Execute este SQL apenas UMA VEZ após o deploy da edge function.
-- 
-- Como executar:
-- 1. Acesse: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/sql/new
-- 2. Cole este SQL no editor
-- 3. Clique em "Run" para executar
-- ============================================================

-- Habilitar extensões necessárias (caso ainda não estejam habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job anterior se existir (para evitar duplicatas)
SELECT cron.unschedule('daily-performance-snapshot');

-- Criar job que roda às 0h todo dia (horário UTC)
-- Nota: 0h UTC = 21h do dia anterior no horário de Brasília (UTC-3)
-- Ajuste o horário conforme necessário para seu timezone
SELECT cron.schedule(
  'daily-performance-snapshot',
  '0 3 * * *', -- 3h UTC = 0h Brasília
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/daily-performance-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := jsonb_build_object('time', now()::text)
  ) as request_id;
  $$
);

-- Verificar se o job foi criado com sucesso
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'daily-performance-snapshot';

-- ============================================================
-- COMANDOS ÚTEIS PARA GERENCIAMENTO DO CRON
-- ============================================================

-- Para LISTAR todos os jobs agendados:
-- SELECT * FROM cron.job;

-- Para PAUSAR o job (mantém configuração mas não executa):
-- UPDATE cron.job SET active = false WHERE jobname = 'daily-performance-snapshot';

-- Para REATIVAR o job:
-- UPDATE cron.job SET active = true WHERE jobname = 'daily-performance-snapshot';

-- Para REMOVER o job completamente:
-- SELECT cron.unschedule('daily-performance-snapshot');

-- Para VER HISTÓRICO de execuções:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-performance-snapshot') ORDER BY start_time DESC LIMIT 10;

-- Para EXECUTAR MANUALMENTE (testar agora):
-- SELECT net.http_post(
--   url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/daily-performance-snapshot',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
--   ),
--   body := jsonb_build_object('time', now()::text)
-- ) as request_id;
