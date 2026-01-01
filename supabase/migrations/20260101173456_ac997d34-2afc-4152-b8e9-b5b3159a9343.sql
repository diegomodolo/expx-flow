-- Add grammar validation columns to instagram_auto_posts table
ALTER TABLE public.instagram_auto_posts 
ADD COLUMN IF NOT EXISTS grammar_validated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS grammar_validation_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS grammar_errors text[];