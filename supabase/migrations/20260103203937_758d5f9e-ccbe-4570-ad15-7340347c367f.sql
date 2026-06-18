INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-media',
  'client-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public read access for client-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'client-media');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload to client-media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-media' 
  AND auth.role() = 'authenticated'
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role has full access to client-media"
ON storage.objects
FOR ALL
USING (bucket_id = 'client-media')
WITH CHECK (bucket_id = 'client-media');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
