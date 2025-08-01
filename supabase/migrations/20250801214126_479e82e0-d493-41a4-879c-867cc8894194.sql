-- Add leads_generated column and remove last_access from clients table
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS last_access;

ALTER TABLE public.clients 
ADD COLUMN leads_generated integer DEFAULT 0;