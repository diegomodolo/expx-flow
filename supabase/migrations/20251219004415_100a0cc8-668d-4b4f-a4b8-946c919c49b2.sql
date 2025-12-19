-- Add AI reference images columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS ai_reference_image_1 TEXT,
ADD COLUMN IF NOT EXISTS ai_reference_image_2 TEXT,
ADD COLUMN IF NOT EXISTS ai_reference_image_3 TEXT;