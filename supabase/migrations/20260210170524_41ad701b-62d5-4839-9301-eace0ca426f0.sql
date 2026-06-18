ALTER TABLE public.groupops_campaigns DROP CONSTRAINT groupops_campaigns_type_check;
DO $$ BEGIN
  ALTER TABLE public.groupops_campaigns ADD CONSTRAINT groupops_campaigns_type_check CHECK (type = ANY (ARRAY['DAILY_PROMPT','CHECKIN','CHALLENGE','CASE_STUDY','RANKING','WELCOME','REACTIVATION','CUSTOM','WEEKLY_RANKING','CASE_OF_DAY','DIGEST','POLL']));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
