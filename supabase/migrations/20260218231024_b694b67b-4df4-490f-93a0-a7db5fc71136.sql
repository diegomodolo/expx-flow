DO $$ BEGIN
  CREATE POLICY "Service role full access to task_history"
ON public.task_history
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
