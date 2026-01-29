-- Add CS TV dashboard token column to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS cs_tv_dashboard_token TEXT UNIQUE;

-- Create index for fast lookups by token
CREATE INDEX IF NOT EXISTS idx_companies_cs_tv_token ON public.companies(cs_tv_dashboard_token) WHERE cs_tv_dashboard_token IS NOT NULL;

-- Create function to generate unique CS TV dashboard token
CREATE OR REPLACE FUNCTION public.generate_cs_tv_dashboard_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    new_token := replace(gen_random_uuid()::text, '-', '');
    new_token := substring(new_token, 1, 16);
    
    SELECT EXISTS(
      SELECT 1 FROM public.companies WHERE cs_tv_dashboard_token = new_token
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$function$;

-- Create function to set CS TV dashboard token with security checks
CREATE OR REPLACE FUNCTION public.set_cs_tv_dashboard_token(p_company_id uuid, p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_company_id IS NULL OR p_token IS NULL OR length(p_token) = 0 THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  -- Check if user is member of the company via company_members, employees, OR is the creator
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE user_id = auth.uid() AND company_id = p_company_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() AND company_id = p_company_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = p_company_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.companies
  SET cs_tv_dashboard_token = p_token,
      updated_at = now()
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company not found';
  END IF;
END;
$function$;