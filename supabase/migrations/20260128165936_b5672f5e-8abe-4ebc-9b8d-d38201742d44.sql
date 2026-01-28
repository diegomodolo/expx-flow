-- Add is_muted column to track muted conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN is_muted BOOLEAN DEFAULT FALSE;