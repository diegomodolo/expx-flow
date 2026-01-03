-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for daily ad generator scheduler (runs every hour)
SELECT cron.schedule(
  'daily-ad-generator-scheduler',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/daily-ad-generator-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);