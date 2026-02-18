-- Add service_role full access policy for task_history (agents use service_role and their user_ids aren't in auth.users)
CREATE POLICY "Service role full access to task_history"
ON public.task_history
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');