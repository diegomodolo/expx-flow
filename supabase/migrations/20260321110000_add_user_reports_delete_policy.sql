-- Allow users to delete their own reports
CREATE POLICY "Users can delete their own reports"
ON public.user_reports
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

-- Ensure DELETE is granted
GRANT DELETE ON public.user_reports TO authenticated;
