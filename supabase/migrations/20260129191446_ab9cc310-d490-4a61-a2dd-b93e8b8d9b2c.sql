-- Remove the existing CHECK constraint on message_type
ALTER TABLE public.whatsapp_messages 
DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check;
DO $$ BEGIN
  ALTER TABLE public.whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'gif'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
