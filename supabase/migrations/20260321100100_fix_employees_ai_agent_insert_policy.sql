-- Allow company members (not just admins/owners) to create AI agent employees
-- Fixes #228: users with agentes-ia permission but member role were blocked
CREATE POLICY "Company members can create AI agent employees"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (
  ia_agent_id IS NOT NULL
  AND company_id IN (
    SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
  )
);
