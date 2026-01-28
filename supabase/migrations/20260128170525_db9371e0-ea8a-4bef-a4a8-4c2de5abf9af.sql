-- Add is_pinned column to track pinned conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;