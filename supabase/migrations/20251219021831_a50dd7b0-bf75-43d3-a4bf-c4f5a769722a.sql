-- Drop existing insert policy and create a more permissive one
DROP POLICY IF EXISTS "Users can create presentations in their company" ON public.campaign_presentations;

-- Create new insert policy that allows authenticated users to insert if they own the company or are a member
CREATE POLICY "Users can create presentations in their company"
ON public.campaign_presentations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  )
);