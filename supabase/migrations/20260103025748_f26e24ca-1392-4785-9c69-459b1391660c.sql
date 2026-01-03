-- Create storage bucket for client assets (ad creatives, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-assets', 
  'client-assets', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
);

-- Allow authenticated users to upload to their client folders
CREATE POLICY "Authenticated users can upload client assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-assets');

-- Allow public read access to all client assets
CREATE POLICY "Public read access to client assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-assets');

-- Allow service role to manage all assets
CREATE POLICY "Service role can manage all client assets"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'client-assets');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Users can update their client assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-assets');

CREATE POLICY "Users can delete their client assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-assets');