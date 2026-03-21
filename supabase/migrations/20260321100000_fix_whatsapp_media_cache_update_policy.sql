-- Add missing UPDATE policy for whatsapp-media-cache storage bucket
-- The upload code uses upsert: true, which requires UPDATE when file already exists
CREATE POLICY "Authenticated users can update whatsapp media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'whatsapp-media-cache')
WITH CHECK (bucket_id = 'whatsapp-media-cache');
