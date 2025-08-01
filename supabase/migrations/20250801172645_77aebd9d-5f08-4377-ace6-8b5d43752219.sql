-- Fix security warnings by setting search_path on functions
CREATE OR REPLACE FUNCTION public.is_company_admin_or_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = _user_id;
$$;