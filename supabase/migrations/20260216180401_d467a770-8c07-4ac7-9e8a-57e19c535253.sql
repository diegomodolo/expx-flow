-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own columns" ON public.task_board_columns;

-- Create a new SELECT policy that allows viewing columns of any user in the same company
CREATE POLICY "Users can view columns in their company"
ON public.task_board_columns
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
  )
);