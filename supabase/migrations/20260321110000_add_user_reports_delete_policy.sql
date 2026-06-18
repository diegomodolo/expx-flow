DO $$ BEGIN
  CREATE POLICY "Users can delete their own reports"
ON public.user_reports
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Ensure DELETE is granted
GRANT DELETE ON public.user_reports TO authenticated;