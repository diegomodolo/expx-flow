-- Add profile_pic_url column to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;