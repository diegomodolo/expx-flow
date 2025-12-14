-- Create bucket for scheduled posts media
INSERT INTO storage.buckets (id, name, public)
VALUES ('scheduled-posts-media', 'scheduled-posts-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload media
CREATE POLICY "Authenticated users can upload scheduled posts media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scheduled-posts-media');

-- Policy: Anyone can view public media
CREATE POLICY "Anyone can view scheduled posts media"
ON storage.objects FOR SELECT
USING (bucket_id = 'scheduled-posts-media');

-- Policy: Authenticated users can delete their own media
CREATE POLICY "Authenticated users can delete scheduled posts media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'scheduled-posts-media');