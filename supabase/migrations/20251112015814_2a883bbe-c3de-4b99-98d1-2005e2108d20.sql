-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar cron job para processar recovery triggers a cada 6 horas
-- Formato: minuto hora dia mês dia-da-semana
-- '0 */6 * * *' = A cada 6 horas (00:00, 06:00, 12:00, 18:00)
SELECT cron.schedule(
  'process-recovery-triggers-every-6h',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/process-recovery-triggers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);