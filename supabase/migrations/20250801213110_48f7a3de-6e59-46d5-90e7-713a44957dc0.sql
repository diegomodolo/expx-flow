-- Remove the global unique constraint on sectors name
ALTER TABLE public.sectors DROP CONSTRAINT IF EXISTS sectors_name_key;
DO $$ BEGIN
  ALTER TABLE public.sectors ADD CONSTRAINT sectors_name_company_unique UNIQUE (name, company_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
