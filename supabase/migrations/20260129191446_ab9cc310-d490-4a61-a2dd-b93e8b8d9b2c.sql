-- Remove the existing CHECK constraint on message_type
ALTER TABLE public.whatsapp_messages 
DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check;

-- Add new CHECK constraint that includes sticker and gif
ALTER TABLE public.whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'gif'));