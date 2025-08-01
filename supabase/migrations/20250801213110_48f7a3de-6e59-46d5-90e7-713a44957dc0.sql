-- Remove the global unique constraint on sectors name
ALTER TABLE public.sectors DROP CONSTRAINT IF EXISTS sectors_name_key;

-- Add a unique constraint for name per company
ALTER TABLE public.sectors ADD CONSTRAINT sectors_name_company_unique UNIQUE (name, company_id);