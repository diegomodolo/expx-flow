-- Add reply_to field to whatsapp_messages for quoted messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_reply_to ON public.whatsapp_messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;