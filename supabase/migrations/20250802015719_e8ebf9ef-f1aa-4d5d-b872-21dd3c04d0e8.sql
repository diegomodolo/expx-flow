-- Add balance and funding status fields to facebook_ad_accounts table
ALTER TABLE public.facebook_ad_accounts ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.facebook_ad_accounts ADD COLUMN IF NOT EXISTS account_status INTEGER DEFAULT 1;
ALTER TABLE public.facebook_ad_accounts ADD COLUMN IF NOT EXISTS disable_reason TEXT;
ALTER TABLE public.facebook_ad_accounts ADD COLUMN IF NOT EXISTS spend_cap NUMERIC DEFAULT 0;
ALTER TABLE public.facebook_ad_accounts ADD COLUMN IF NOT EXISTS has_funding_issues BOOLEAN DEFAULT false;
ALTER TABLE public.facebook_ad_accounts ADD COLUMN IF NOT EXISTS last_balance_check TIMESTAMP WITH TIME ZONE DEFAULT now();