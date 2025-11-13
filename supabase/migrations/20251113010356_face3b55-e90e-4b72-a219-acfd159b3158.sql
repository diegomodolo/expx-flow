-- Drop existing policy if it exists
DROP POLICY IF EXISTS "System can update automation progress" ON automation_execution_progress;

-- Add UPDATE policy for automation_execution_progress
CREATE POLICY "System can update automation progress"
  ON automation_execution_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);