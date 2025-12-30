-- Add trigger_name column to whatsapp_execution_log table
ALTER TABLE public.whatsapp_execution_log 
ADD COLUMN IF NOT EXISTS trigger_name TEXT;

-- Add index for better querying
CREATE INDEX IF NOT EXISTS idx_whatsapp_execution_log_trigger_name 
ON public.whatsapp_execution_log(trigger_name);