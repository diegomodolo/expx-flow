-- Add column to force realtime analysis for all chats
ALTER TABLE public.whatsapp_ai_agent_config
ADD COLUMN IF NOT EXISTS force_realtime_analysis BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.whatsapp_ai_agent_config.force_realtime_analysis IS 'When true, realtime analysis is always enabled for all chats and users cannot disable it';