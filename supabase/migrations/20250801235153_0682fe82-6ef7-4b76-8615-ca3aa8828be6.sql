-- Add missing fields to campaigns table for better insights
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_ranking TEXT,
ADD COLUMN IF NOT EXISTS engagement_rate_ranking TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate_ranking TEXT;

-- Add missing fields to ad_sets table for better insights  
ALTER TABLE public.ad_sets
ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_ranking TEXT,
ADD COLUMN IF NOT EXISTS engagement_rate_ranking TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate_ranking TEXT;

-- Add missing fields to ads table for better insights
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_ranking TEXT,
ADD COLUMN IF NOT EXISTS engagement_rate_ranking TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate_ranking TEXT;