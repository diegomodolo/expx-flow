-- Drop the restrictive admin-only policy
DROP POLICY "Admins can manage segments" ON public.lead_segments;

-- Create a new policy allowing any company member to manage segments
CREATE POLICY "Company members can manage segments"
ON public.lead_segments
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
);