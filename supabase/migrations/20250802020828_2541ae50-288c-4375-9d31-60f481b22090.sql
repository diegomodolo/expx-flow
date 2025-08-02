-- Add funding type to facebook_ad_accounts table
ALTER TABLE public.facebook_ad_accounts 
ADD COLUMN funding_source_details JSONB,
ADD COLUMN is_prepaid BOOLEAN DEFAULT false;