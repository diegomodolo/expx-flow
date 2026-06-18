-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Public can update meetings in progress" ON presentation_meetings;
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
