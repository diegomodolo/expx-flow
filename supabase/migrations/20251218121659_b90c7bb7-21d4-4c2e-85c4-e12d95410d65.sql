-- Add budget columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS daily_budget numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lifetime_budget numeric DEFAULT NULL;