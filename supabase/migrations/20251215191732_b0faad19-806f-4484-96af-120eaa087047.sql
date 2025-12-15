-- Add execution_log_id to whatsapp_notification_log to link messages to executions
ALTER TABLE public.whatsapp_notification_log
ADD COLUMN IF NOT EXISTS execution_log_id UUID REFERENCES public.whatsapp_execution_log(id) ON DELETE SET NULL;

-- Add client_id and client_name for easier querying
ALTER TABLE public.whatsapp_notification_log
ADD COLUMN IF NOT EXISTS client_id UUID;

ALTER TABLE public.whatsapp_notification_log
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Add contact_name for display
ALTER TABLE public.whatsapp_notification_log
ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_log_execution_id ON public.whatsapp_notification_log(execution_log_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_client_id ON public.whatsapp_notification_log(client_id);