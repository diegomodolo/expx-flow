-- Add fields to track last sync information
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_sync_period text;