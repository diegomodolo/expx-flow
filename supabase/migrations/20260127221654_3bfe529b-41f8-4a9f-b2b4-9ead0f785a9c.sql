-- Drop existing constraint and recreate with "sending" and "deleted" status included
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_status_check;

ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_status_check 
  CHECK (status = ANY (ARRAY['pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'deleted']));