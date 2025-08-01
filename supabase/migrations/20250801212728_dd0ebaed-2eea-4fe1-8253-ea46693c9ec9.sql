-- Add ad_account_id column to clients table
ALTER TABLE public.clients 
ADD COLUMN ad_account_id uuid REFERENCES public.facebook_ad_accounts(id);