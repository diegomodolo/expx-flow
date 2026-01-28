-- Add ready_message column to store the suggested message
ALTER TABLE public.whatsapp_realtime_analysis
ADD COLUMN IF NOT EXISTS ready_message TEXT;