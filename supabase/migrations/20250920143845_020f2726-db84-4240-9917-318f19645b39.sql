DO $$ BEGIN
  CREATE POLICY "Company members can update reports" 
ON public.lead_disqualification_reports 
FOR UPDATE 
USING (company_id IN ( 
  SELECT company_members.company_id
  FROM company_members
  WHERE (company_members.user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
