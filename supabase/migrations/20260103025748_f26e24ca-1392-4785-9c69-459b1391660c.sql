INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-assets', 
  'client-assets', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload client assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read access to client assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage all client assets"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'client-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their client assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their client assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
