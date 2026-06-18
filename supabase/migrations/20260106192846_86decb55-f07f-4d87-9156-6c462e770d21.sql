-- Create bucket for reels videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels-videos', 'reels-videos', true)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload reels videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reels-videos');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update reels videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reels-videos');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete reels videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reels-videos');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read access for reels videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reels-videos');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
