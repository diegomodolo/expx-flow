-- Create crm-assets storage bucket for CRM user avatars and other assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-assets', 'crm-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to crm-assets bucket
CREATE POLICY "Public read access for crm-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'crm-assets');

-- Allow authenticated users to upload to crm-assets bucket
CREATE POLICY "Authenticated users can upload to crm-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'crm-assets');

-- Allow authenticated users to update their uploads in crm-assets
CREATE POLICY "Authenticated users can update crm-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'crm-assets');

-- Allow authenticated users to delete from crm-assets
CREATE POLICY "Authenticated users can delete from crm-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'crm-assets');