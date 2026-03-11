-- Add friendly_title column for AI-generated user-friendly descriptions
ALTER TABLE public.release_notes ADD COLUMN IF NOT EXISTS friendly_title TEXT;
