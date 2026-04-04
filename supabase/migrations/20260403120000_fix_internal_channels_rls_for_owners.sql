-- Fix RLS for internal_channels INSERT: company owners who are not in company_members
-- were getting "new row violates row-level security policy" when auto-creating channels.
-- Add a second INSERT policy that allows company owners to insert channels.

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
