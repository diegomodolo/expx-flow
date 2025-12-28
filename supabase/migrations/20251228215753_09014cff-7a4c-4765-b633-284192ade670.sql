-- Adicionar coluna tv_dashboard_token na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS tv_dashboard_token TEXT UNIQUE;

-- Criar função para gerar token único
CREATE OR REPLACE FUNCTION public.generate_tv_dashboard_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar token usando gen_random_uuid e remover hifens
    new_token := replace(gen_random_uuid()::text, '-', '');
    -- Pegar primeiros 16 caracteres para um token curto
    new_token := substring(new_token, 1, 16);
    
    SELECT EXISTS(
      SELECT 1 FROM public.companies WHERE tv_dashboard_token = new_token
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$;

-- Criar índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_companies_tv_dashboard_token 
ON public.companies(tv_dashboard_token) 
WHERE tv_dashboard_token IS NOT NULL;