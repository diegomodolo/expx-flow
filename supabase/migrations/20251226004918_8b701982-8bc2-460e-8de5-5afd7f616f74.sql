-- Criar tabela cnae_lead_pool com todos os campos incluindo múltiplos telefones
CREATE TABLE IF NOT EXISTS public.cnae_lead_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação da empresa
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  
  -- CNAE
  cnae_code TEXT NOT NULL,
  cnae_description TEXT,
  
  -- Endereço
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  cep TEXT,
  
  -- Contato - MÚLTIPLOS TELEFONES
  ddd TEXT,
  phone TEXT,
  phone_2 TEXT,
  phone_3 TEXT,
  email TEXT,
  
  -- Dados adicionais
  situacao_cadastral TEXT,
  data_situacao TEXT,
  capital_social NUMERIC,
  porte TEXT,
  natureza_juridica TEXT,
  data_abertura TEXT,
  
  -- Controle
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT DEFAULT 'import',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint para evitar duplicatas
  CONSTRAINT cnae_lead_pool_unique_cnpj_company UNIQUE (cnpj, company_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cnae_lead_pool_company_id ON public.cnae_lead_pool(company_id);
CREATE INDEX IF NOT EXISTS idx_cnae_lead_pool_cnae_code ON public.cnae_lead_pool(cnae_code);
CREATE INDEX IF NOT EXISTS idx_cnae_lead_pool_uf ON public.cnae_lead_pool(uf);
CREATE INDEX IF NOT EXISTS idx_cnae_lead_pool_municipio ON public.cnae_lead_pool(municipio);

-- RLS
ALTER TABLE public.cnae_lead_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cnae_lead_pool from their companies"
ON public.cnae_lead_pool FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert cnae_lead_pool to their companies"
ON public.cnae_lead_pool FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update cnae_lead_pool from their companies"
ON public.cnae_lead_pool FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete cnae_lead_pool from their companies"
ON public.cnae_lead_pool FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Trigger para updated_at
CREATE TRIGGER update_cnae_lead_pool_updated_at
BEFORE UPDATE ON public.cnae_lead_pool
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_pool_updated_at();

-- Comentários
COMMENT ON TABLE public.cnae_lead_pool IS 'Pool de leads importados por CNAE';
COMMENT ON COLUMN public.cnae_lead_pool.ddd IS 'DDD separado (usado para concatenação durante importação)';
COMMENT ON COLUMN public.cnae_lead_pool.phone IS 'Telefone principal';
COMMENT ON COLUMN public.cnae_lead_pool.phone_2 IS 'Telefone secundário';
COMMENT ON COLUMN public.cnae_lead_pool.phone_3 IS 'Telefone terciário (celular)';