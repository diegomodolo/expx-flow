-- Atualizar a função para gerar tokens mais curtos (8 caracteres ao invés de 16)
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
    -- Gerar token de 8 caracteres (mais curto para facilitar digitação em TV)
    new_token := replace(gen_random_uuid()::text, '-', '');
    new_token := substring(new_token, 1, 8);
    
    SELECT EXISTS(
      SELECT 1 FROM public.companies WHERE radar_tv_dashboard_token = new_token
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$;