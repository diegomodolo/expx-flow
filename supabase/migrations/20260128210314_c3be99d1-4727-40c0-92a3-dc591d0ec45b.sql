-- Add column to track which message was last analyzed
ALTER TABLE public.whatsapp_realtime_analysis 
ADD COLUMN IF NOT EXISTS last_analyzed_message_id TEXT;