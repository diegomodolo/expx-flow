DO $$ BEGIN
  CREATE POLICY "Company owners can create channels"
ON public.internal_channels FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_id
    AND c.created_by = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
