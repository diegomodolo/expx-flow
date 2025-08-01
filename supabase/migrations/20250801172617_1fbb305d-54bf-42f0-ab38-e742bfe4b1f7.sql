-- Fix infinite recursion in company_members RLS policies
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Company owners and admins can manage members" ON company_members;
DROP POLICY IF EXISTS "Users can view members of their companies" ON company_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON company_members;

-- Create a security definer function to check if user is company admin/owner
CREATE OR REPLACE FUNCTION public.is_company_admin_or_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role IN ('owner', 'admin')
  );
$$;

-- Create a security definer function to get user's company IDs
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = _user_id;
$$;

-- Recreate the policies using the security definer functions
CREATE POLICY "Users can view their own membership"
ON company_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view members of their companies"
ON company_members
FOR SELECT
TO authenticated
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Company owners and admins can manage members"
ON company_members
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  is_company_admin_or_owner(auth.uid(), company_id)
)
WITH CHECK (
  user_id = auth.uid() OR
  is_company_admin_or_owner(auth.uid(), company_id)
);

-- Verify that the user fdr@gmail.com has a company
SELECT 
  u.email,
  cm.user_id,
  cm.company_id,
  cm.role,
  c.name as company_name
FROM auth.users u
LEFT JOIN company_members cm ON cm.user_id = u.id
LEFT JOIN companies c ON c.id = cm.company_id
WHERE u.email = 'fdr@gmail.com';