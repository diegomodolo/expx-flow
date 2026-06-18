-- Create the client-files bucket for storing reference images and other client files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-files',
  'client-files',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Public read access for client-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-files');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload to client-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-files' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update in client-files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-files' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete from client-files"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-files' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
