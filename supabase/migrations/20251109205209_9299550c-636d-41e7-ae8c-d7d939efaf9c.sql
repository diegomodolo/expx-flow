-- Garantir que a extensão pgcrypto está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recriar a função generate_crm_access_token com a sintaxe correta
CREATE OR REPLACE FUNCTION public.generate_crm_access_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar token usando gen_random_bytes da extensão pgcrypto
    new_token := encode(gen_random_bytes(16), 'hex');
    
    -- Verificar se o token já existe
    SELECT EXISTS(
      SELECT 1 FROM crm_workspaces WHERE access_token = new_token
    ) INTO token_exists;
    
    -- Se não existir, retornar
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$;