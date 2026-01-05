ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS radar_tv_dashboard_token text;

CREATE OR REPLACE FUNCTION public.generate_radar_tv_dashboard_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    new_token := replace(gen_random_uuid()::text, '-', '');
    new_token := substring(new_token, 1, 16);
    
    SELECT EXISTS(
      SELECT 1 FROM public.companies WHERE radar_tv_dashboard_token = new_token
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_radar_tv_dashboard_token() TO authenticated;