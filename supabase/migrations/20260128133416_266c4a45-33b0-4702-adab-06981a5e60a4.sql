-- Add is_edited column to track edited messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;

-- Add edited_at column to know when it was edited
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Add original_message_id to link edited messages to originals
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS original_message_id text;