-- Update function to also check if user is the company creator
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

  -- Check if user is member of the company OR the creator
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE user_id = auth.uid() AND company_id = p_company_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = p_company_id AND created_by = auth.uid()
  ) THEN
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