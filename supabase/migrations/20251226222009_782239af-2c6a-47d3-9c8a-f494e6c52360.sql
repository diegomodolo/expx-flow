-- Drop the existing constraint and add a new one with all status values
ALTER TABLE public.crm_deals DROP CONSTRAINT crm_deals_status_check;

ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_status_check 
CHECK (status = ANY (ARRAY['open'::text, 'won'::text, 'lost'::text, 'qualified'::text, 'unqualified'::text]));