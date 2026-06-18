DO $$ BEGIN
  CREATE POLICY "Authenticated users can update whatsapp media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'whatsapp-media-cache')
WITH CHECK (bucket_id = 'whatsapp-media-cache');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
