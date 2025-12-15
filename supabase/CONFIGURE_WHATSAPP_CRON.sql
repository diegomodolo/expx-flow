-- ============================================
-- CRON JOB: WhatsApp Notifications Scheduler
-- ============================================
-- Este script configura o CRON job que processa
-- notificações WhatsApp automaticamente.
--
-- IMPORTANTE: Execute este SQL no SQL Editor do Supabase
-- https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/sql/new
-- ============================================

-- 1. Habilitar extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover job existente (caso exista)
SELECT cron.unschedule('whatsapp-notifications-scheduler');

-- 3. Criar CRON job que executa a cada 5 minutos
SELECT cron.schedule(
  'whatsapp-notifications-scheduler',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/process-whatsapp-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 4. Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-notifications-scheduler';

-- ============================================
-- COMANDOS ÚTEIS DE MANUTENÇÃO
-- ============================================

-- Ver todos os jobs agendados:
-- SELECT * FROM cron.job;

-- Ver histórico de execuções:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Pausar o job temporariamente:
-- UPDATE cron.job SET active = false WHERE jobname = 'whatsapp-notifications-scheduler';

-- Reativar o job:
-- UPDATE cron.job SET active = true WHERE jobname = 'whatsapp-notifications-scheduler';

-- Remover o job completamente:
-- SELECT cron.unschedule('whatsapp-notifications-scheduler');
