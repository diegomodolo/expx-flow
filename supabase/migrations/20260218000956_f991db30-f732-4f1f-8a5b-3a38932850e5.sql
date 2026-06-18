
-- Add file columns to internal_messages
ALTER TABLE public.internal_messages
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text;


-- Create storage bucket for internal chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('internal-chat-files', 'internal-chat-files', true)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'internal-chat-files');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'internal-chat-files');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'internal-chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
