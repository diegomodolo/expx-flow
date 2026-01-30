-- Add needs_response column to track if conversation actually needs a reply
ALTER TABLE public.whatsapp_realtime_analysis 
ADD COLUMN IF NOT EXISTS needs_response BOOLEAN DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN public.whatsapp_realtime_analysis.needs_response IS 'AI-determined flag: true if last client message requires a response, false if it was just a confirmation/thanks';

-- Also add to history table for tracking
ALTER TABLE public.whatsapp_realtime_analysis_history 
ADD COLUMN IF NOT EXISTS needs_response BOOLEAN DEFAULT true;