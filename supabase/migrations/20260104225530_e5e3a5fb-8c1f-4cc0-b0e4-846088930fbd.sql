-- Add social_tv_dashboard_token column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS social_tv_dashboard_token TEXT UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_companies_social_tv_dashboard_token 
ON public.companies(social_tv_dashboard_token) 
WHERE social_tv_dashboard_token IS NOT NULL;

-- Function to generate unique social TV dashboard token
CREATE OR REPLACE FUNCTION public.generate_social_tv_dashboard_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    new_token := replace(gen_random_uuid()::text, '-', '');
    new_token := substring(new_token, 1, 16);
    
    SELECT EXISTS(
      SELECT 1 FROM public.companies WHERE social_tv_dashboard_token = new_token
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$;

-- Function to set social TV dashboard token (with security check)
CREATE OR REPLACE FUNCTION public.set_social_tv_dashboard_token(p_company_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  SET social_tv_dashboard_token = p_token,
      updated_at = now()
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company not found';
  END IF;
END;
$$;