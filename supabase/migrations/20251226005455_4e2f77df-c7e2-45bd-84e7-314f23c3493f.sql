-- Adicionar campos de MEI, Simples Nacional e dados do sócio
ALTER TABLE public.cnae_lead_pool 
ADD COLUMN IF NOT EXISTS simples_option TEXT,
ADD COLUMN IF NOT EXISTS simples_option_date TEXT,
ADD COLUMN IF NOT EXISTS mei_option TEXT,
ADD COLUMN IF NOT EXISTS partner_name TEXT,
ADD COLUMN IF NOT EXISTS partner_role TEXT,
ADD COLUMN IF NOT EXISTS partner_cpf TEXT;

-- Comentários
COMMENT ON COLUMN public.cnae_lead_pool.simples_option IS 'Opção pelo Simples Nacional (Sim/Não)';
COMMENT ON COLUMN public.cnae_lead_pool.simples_option_date IS 'Data de opção pelo Simples';
COMMENT ON COLUMN public.cnae_lead_pool.mei_option IS 'Opção pelo MEI (Sim/Não)';
COMMENT ON COLUMN public.cnae_lead_pool.partner_name IS 'Nome do sócio/proprietário';
COMMENT ON COLUMN public.cnae_lead_pool.partner_role IS 'Cargo do sócio/proprietário';
COMMENT ON COLUMN public.cnae_lead_pool.partner_cpf IS 'CPF do sócio/proprietário';