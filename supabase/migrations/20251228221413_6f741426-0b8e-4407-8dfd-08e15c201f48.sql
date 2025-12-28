-- Create a secure RPC to set a company's TV dashboard token
-- This avoids RLS update issues while still enforcing authorization.

CREATE OR REPLACE FUNCTION public.set_tv_dashboard_token(p_company_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_company_id IS NULL OR p_token IS NULL OR length(p_token) = 0 THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  -- Only company owner/admin can set the token
  IF NOT public.is_company_admin_or_owner(auth.uid(), p_company_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.companies
  SET tv_dashboard_token = p_token,
      updated_at = now()
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company not found';
  END IF;
END;
$$;