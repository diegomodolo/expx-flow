-- Fix RLS policy for acquisition_funnels to allow company members to create funnels
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Company members can create funnels" ON acquisition_funnels;

-- Create new INSERT policy with explicit authentication check
CREATE POLICY "Company members can create funnels"
ON acquisition_funnels
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM company_members
    WHERE user_id = auth.uid()
  )
);