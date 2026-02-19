-- Create a SECURITY DEFINER function to allow company members to stop any active time tracking session
-- This is needed because AI agent sessions use an agent user_id that doesn't match the logged-in user
CREATE OR REPLACE FUNCTION public.stop_time_tracking_session(p_session_id uuid, p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is a member of the company that owns the session
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = auth.uid() AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Update the session, ensuring it belongs to the correct company
  UPDATE public.task_time_tracking
  SET ended_at = NOW()
  WHERE id = p_session_id
    AND company_id = p_company_id
    AND ended_at IS NULL;
END;
$$;

-- Also update RLS to allow company members to update sessions in their company
-- (needed for manual stop of any session, including agent sessions)
DROP POLICY IF EXISTS "Users can update their own time tracking" ON public.task_time_tracking;

CREATE POLICY "Company members can update time tracking in their company"
ON public.task_time_tracking
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
  )
);