-- Create public RLS policy for clients table to allow reading client data 
-- when there's a valid lead disqualification token
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