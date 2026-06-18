DO $$ BEGIN
  CREATE POLICY "Public can view client data with valid disqualification token" 
ON public.clients 
FOR SELECT 
USING (
  id IN (
    SELECT client_id 
    FROM public.lead_disqualification_tokens 
    WHERE client_id = clients.id
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
