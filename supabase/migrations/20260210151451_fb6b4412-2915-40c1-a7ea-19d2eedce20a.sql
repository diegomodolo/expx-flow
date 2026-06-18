-- Self-host: cron job parametrizado via env vars do runtime.
-- Substitui URL + bearer hardcoded por SUPABASE_URL + SUPABASE_ANON_KEY.
-- Torna unschedule resiliente a job inexistente.

-- 1) Tenta desagendar job 54 se existir (dev); ignora se não existir.
DO $$
BEGIN
  PERFORM cron.unschedule(54);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'job 54 não existe (banco novo): %', SQLERRM;
END $$;

-- 2) Agenda novo job usando env vars do runtime (preenchidas automaticamente pelo Supabase).
DO $$
DECLARE
  _url text;
BEGIN
  SELECT current_setting('app.supabase_url', true) INTO _url;
  -- Se ainda assim não houver URL, pula (cliente deve rodar setup-cron-jobs depois)
  IF _url IS NULL OR _url = '' THEN
    RAISE NOTICE 'Sem SUPABASE_URL disponível; pulando schedule. Execute setup-cron-jobs depois.';
    RETURN;
  END IF;
END $$;

-- 3) Agenda o job usando função SQL dinâmica que pega URL/key em runtime.
-- Usando SECURITY DEFINER wrapper porque pg_cron não suporta current_setting em todos os contextos.
CREATE OR REPLACE FUNCTION public.call_groupops_campaign_cron()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/groupops-campaign-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object('time', now()::text)
  );
$$;

SELECT cron.schedule(
  'groupops-campaign-cron-1min',
  '* * * * *',
  $$ SELECT public.call_groupops_campaign_cron(); $$
);
