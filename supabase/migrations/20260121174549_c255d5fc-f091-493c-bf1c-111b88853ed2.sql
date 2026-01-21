-- Tornar facebook_page_id nullable para permitir contas Instagram vindas do Business Manager
ALTER TABLE instagram_accounts 
ALTER COLUMN facebook_page_id DROP NOT NULL;

-- Adicionar colunas para identificar origem da conta
ALTER TABLE instagram_accounts 
ADD COLUMN IF NOT EXISTS business_id text,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'page';

-- Remover constraint antigo (facebook_page_id, instagram_id)
ALTER TABLE instagram_accounts DROP CONSTRAINT IF EXISTS instagram_accounts_facebook_page_id_instagram_id_key;

-- Criar novo constraint único por company_id e instagram_id
-- Isso evita duplicatas quando a mesma conta vem de fontes diferentes
ALTER TABLE instagram_accounts ADD CONSTRAINT instagram_accounts_company_instagram_unique 
UNIQUE (company_id, instagram_id);

-- Adicionar índice para buscas por business_id
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_business_id ON instagram_accounts(business_id);