DO $$ BEGIN
  CREATE POLICY "Company members can view profiles of other company members" 
ON public.profiles 
FOR SELECT 
USING (
  user_id IN (
    SELECT cm1.user_id
    FROM public.company_members cm1
    WHERE cm1.company_id IN (
      SELECT cm2.company_id
      FROM public.company_members cm2
      WHERE cm2.user_id = auth.uid()
    )
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
