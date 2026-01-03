-- Create storage bucket for client media (creatives, images, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-media',
  'client-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- Allow public read access to the bucket
CREATE POLICY "Public read access for client-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'client-media');

-- Allow authenticated users to upload to their client's folder
CREATE POLICY "Authenticated users can upload to client-media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-media' 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role has full access to client-media"
ON storage.objects
FOR ALL
USING (bucket_id = 'client-media')
WITH CHECK (bucket_id = 'client-media');