-- Create crm-assets storage bucket for CRM user avatars and other assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-assets', 'crm-assets', true)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Public read access for crm-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'crm-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload to crm-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'crm-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update crm-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'crm-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete from crm-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'crm-assets');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
