-- Create bucket for scheduled posts media
INSERT INTO storage.buckets (id, name, public)
VALUES ('scheduled-posts-media', 'scheduled-posts-media', true)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload scheduled posts media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scheduled-posts-media');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view scheduled posts media"
ON storage.objects FOR SELECT
USING (bucket_id = 'scheduled-posts-media');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete scheduled posts media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'scheduled-posts-media');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
