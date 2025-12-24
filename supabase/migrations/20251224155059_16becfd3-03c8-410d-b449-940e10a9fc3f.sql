-- Create bucket for AI generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generated-images',
  'ai-generated-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for ai-generated-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-generated-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload ai-generated-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-generated-images');

-- Allow service role to manage files
CREATE POLICY "Service role can manage ai-generated-images"
ON storage.objects FOR ALL
USING (bucket_id = 'ai-generated-images');