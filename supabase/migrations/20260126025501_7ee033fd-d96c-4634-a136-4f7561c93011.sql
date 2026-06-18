DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload visual-creatives" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'visual-creatives');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update visual-creatives" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'visual-creatives')
WITH CHECK (bucket_id = 'visual-creatives');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete visual-creatives" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'visual-creatives');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
