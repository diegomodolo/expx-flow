-- Drop the old FK that references auth.users
ALTER TABLE public.crm_deals DROP CONSTRAINT IF EXISTS crm_deals_responsible_id_fkey;
DO $$ BEGIN
  ALTER TABLE public.crm_deals 
ADD CONSTRAINT crm_deals_responsible_id_fkey 
FOREIGN KEY (responsible_id) REFERENCES public.crm_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
