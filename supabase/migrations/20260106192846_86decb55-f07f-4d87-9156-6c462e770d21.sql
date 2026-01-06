-- Create bucket for reels videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels-videos', 'reels-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload reels videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reels-videos');

-- Allow authenticated users to update their videos
CREATE POLICY "Authenticated users can update reels videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reels-videos');

-- Allow authenticated users to delete their videos
CREATE POLICY "Authenticated users can delete reels videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reels-videos');

-- Allow public read access since bucket is public
CREATE POLICY "Public read access for reels videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reels-videos');