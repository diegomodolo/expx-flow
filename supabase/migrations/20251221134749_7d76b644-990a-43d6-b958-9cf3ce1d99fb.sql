-- Adicionar novos campos para dados empresariais brasileiros
ALTER TABLE public.lead_master_pool
ADD COLUMN IF NOT EXISTS matriz_filial TEXT,
ADD COLUMN IF NOT EXISTS phone_relevance TEXT,
ADD COLUMN IF NOT EXISTS phone_2 TEXT,
ADD COLUMN IF NOT EXISTS email_relevance TEXT,
ADD COLUMN IF NOT EXISTS registration_status_date DATE,
ADD COLUMN IF NOT EXISTS activity_start_date DATE,
ADD COLUMN IF NOT EXISTS cnae_code TEXT,
ADD COLUMN IF NOT EXISTS cnae_description TEXT,
ADD COLUMN IF NOT EXISTS secondary_cnaes TEXT,
ADD COLUMN IF NOT EXISTS address_type TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS state_full_name TEXT,
ADD COLUMN IF NOT EXISTS municipality_code TEXT,
ADD COLUMN IF NOT EXISTS share_capital NUMERIC,
ADD COLUMN IF NOT EXISTS simples_option BOOLEAN,
ADD COLUMN IF NOT EXISTS simples_option_date DATE,
ADD COLUMN IF NOT EXISTS simples_exclusion_date DATE,
ADD COLUMN IF NOT EXISTS mei_option BOOLEAN,
ADD COLUMN IF NOT EXISTS responsible_federative_entity TEXT,
ADD COLUMN IF NOT EXISTS legal_nature_code TEXT,
ADD COLUMN IF NOT EXISTS legal_nature_description TEXT,
ADD COLUMN IF NOT EXISTS partners TEXT;

-- Criar índices para campos frequentemente usados em filtros
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_cnpj ON public.lead_master_pool(cnpj);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_cnae_code ON public.lead_master_pool(cnae_code);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_company_size ON public.lead_master_pool(company_size);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_state ON public.lead_master_pool(state);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_municipality_code ON public.lead_master_pool(municipality_code);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_simples_option ON public.lead_master_pool(simples_option);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_mei_option ON public.lead_master_pool(mei_option);