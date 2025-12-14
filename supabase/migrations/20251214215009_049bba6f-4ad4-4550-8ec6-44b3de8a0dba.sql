-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Public can update meetings in progress" ON presentation_meetings;

-- Create a more permissive update policy that allows status changes
CREATE POLICY "Public can update meetings for published presentations"
ON presentation_meetings FOR UPDATE
USING (
  presentation_id IN (
    SELECT id FROM content_presentations
    WHERE public_token IS NOT NULL AND status = 'published'
  )
)
WITH CHECK (
  presentation_id IN (
    SELECT id FROM content_presentations
    WHERE public_token IS NOT NULL AND status = 'published'
  )
);