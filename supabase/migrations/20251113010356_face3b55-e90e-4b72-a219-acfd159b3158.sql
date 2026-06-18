-- Drop existing policy if it exists
DROP POLICY IF EXISTS "System can update automation progress" ON automation_execution_progress;
DO $$ BEGIN
  CREATE POLICY "System can update automation progress"
  ON automation_execution_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
