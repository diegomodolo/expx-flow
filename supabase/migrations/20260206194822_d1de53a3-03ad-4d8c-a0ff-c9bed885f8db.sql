-- Add Meta Cloud API fields to whatsapp_instances table
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token TEXT;

-- Create index for fast lookup by Meta phone number ID
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_meta_phone_number_id 
ON public.whatsapp_instances (meta_phone_number_id) 
WHERE meta_phone_number_id IS NOT NULL;

-- Add provider column to whatsapp_conversations for filtering
ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'uazapi';

-- Migrate existing Meta conversations (those without instance_id but with company using Meta)
-- This will be handled by the webhook going forward