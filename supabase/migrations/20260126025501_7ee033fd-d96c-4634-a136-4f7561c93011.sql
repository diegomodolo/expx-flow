-- Add INSERT policy for visual-creatives bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload visual-creatives" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'visual-creatives');

-- Add UPDATE policy for visual-creatives bucket
-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update visual-creatives" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'visual-creatives')
WITH CHECK (bucket_id = 'visual-creatives');

-- Add DELETE policy for visual-creatives bucket
-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete visual-creatives" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'visual-creatives');