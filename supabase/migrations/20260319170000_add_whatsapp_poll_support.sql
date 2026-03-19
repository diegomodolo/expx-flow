-- Add 'poll' to message_type CHECK constraint
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check;
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'gif', 'poll'));

-- Add poll_votes column (JSONB) for storing vote data
-- Structure: { "option_text": ["voter_phone1", "voter_phone2"], ... }
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS poll_votes JSONB DEFAULT NULL;
