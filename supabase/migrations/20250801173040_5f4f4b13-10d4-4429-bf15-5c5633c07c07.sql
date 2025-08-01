-- Create storage bucket for avatars (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for company logos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policies for company-logos bucket
CREATE POLICY "Company logo images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Company members can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id::text = (storage.foldername(name))[1]
    AND cm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Company members can update company logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id::text = (storage.foldername(name))[1]
    AND cm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Company members can delete company logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id::text = (storage.foldername(name))[1]
    AND cm.role IN ('owner', 'admin')
  )
);

-- Add avatar_url column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;