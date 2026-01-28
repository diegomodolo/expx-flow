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

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload quick reply media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-quick-replies');

-- Allow authenticated users to view quick reply media (public bucket)
CREATE POLICY "Anyone can view quick reply media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'whatsapp-quick-replies');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete quick reply media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-quick-replies');