-- Create function to generate radar tv dashboard token
CREATE OR REPLACE FUNCTION public.generate_radar_tv_dashboard_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(8), 'hex');
END;
$$;

-- Create function to set radar tv dashboard token
CREATE OR REPLACE FUNCTION public.set_radar_tv_dashboard_token(p_company_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.companies
  SET radar_tv_dashboard_token = p_token
  WHERE id = p_company_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_radar_tv_dashboard_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_radar_tv_dashboard_token(uuid, text) TO authenticated;