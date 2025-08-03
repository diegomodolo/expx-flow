-- Add new columns to clients table for website and AI briefing functionality
ALTER TABLE public.clients 
ADD COLUMN website_url TEXT,
ADD COLUMN ai_briefing TEXT,
ADD COLUMN briefing_generated_at TIMESTAMP WITH TIME ZONE;