-- Add cached_media_url column to store downloaded media permanently
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS cached_media_url TEXT;

-- Create index for faster lookups on messages with cached media
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_cached_media 
ON public.whatsapp_messages (cached_media_url) 
WHERE cached_media_url IS NOT NULL;

-- Create storage bucket for WhatsApp media cache
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media-cache', 'whatsapp-media-cache', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket - allow authenticated users to upload
CREATE POLICY "Authenticated users can upload whatsapp media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media-cache');

-- Allow public read access to cached media
CREATE POLICY "Public read access to whatsapp media cache"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media-cache');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete whatsapp media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-media-cache');