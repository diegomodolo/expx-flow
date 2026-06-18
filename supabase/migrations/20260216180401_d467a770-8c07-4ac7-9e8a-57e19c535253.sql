-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own columns" ON public.task_board_columns;
DO $$ BEGIN
  CREATE POLICY "Users can view columns in their company"
ON public.task_board_columns
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
