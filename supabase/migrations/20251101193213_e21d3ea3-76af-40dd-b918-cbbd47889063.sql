-- Fix security warning for generate_funnel_public_token function
CREATE OR REPLACE FUNCTION generate_funnel_public_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (12 characters)
    new_token := encode(gen_random_bytes(9), 'hex');
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM public.acquisition_funnels WHERE public_token = new_token
    ) INTO token_exists;
    
    -- If token doesn't exist, return it
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';