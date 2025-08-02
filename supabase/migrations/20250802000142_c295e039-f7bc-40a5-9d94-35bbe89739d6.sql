-- Add missing columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS impressions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0;