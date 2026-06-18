-- Create storage bucket for quick reply media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-quick-replies',
  'whatsapp-quick-replies',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Users can upload quick reply media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-quick-replies');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view quick reply media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'whatsapp-quick-replies');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete quick reply media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-quick-replies');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
