-- Add reaction column to whatsapp_messages table
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS reaction TEXT DEFAULT NULL;

-- Add index for faster reaction lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id 
ON public.whatsapp_messages(external_id) 
WHERE external_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.whatsapp_messages.reaction IS 'Emoji reaction received on this message';