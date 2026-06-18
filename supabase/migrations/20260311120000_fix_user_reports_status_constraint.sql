-- Fix CHECK constraint to include 'fechado' status
ALTER TABLE public.user_reports
  DROP CONSTRAINT IF EXISTS user_reports_status_check;
DO $$ BEGIN
  ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_status_check
  CHECK (status IN ('aberto', 'em_analise', 'implementado', 'recusado', 'fechado'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Ensure GRANT for authenticated users
GRANT SELECT, INSERT ON public.user_reports TO authenticated;