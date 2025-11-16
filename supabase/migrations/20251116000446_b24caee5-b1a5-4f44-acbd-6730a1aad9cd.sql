-- Adicionar campo client_id na tabela google_ads_accounts para associar contas a clientes
ALTER TABLE google_ads_accounts 
ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Adicionar índice para melhorar performance
CREATE INDEX idx_google_ads_accounts_client_id ON google_ads_accounts(client_id);

-- Adicionar campo time_zone se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'google_ads_accounts' 
    AND column_name = 'time_zone'
  ) THEN
    ALTER TABLE google_ads_accounts ADD COLUMN time_zone text;
  END IF;
END $$;

-- Adicionar constraint única para evitar duplicação de customer_id por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_ads_accounts_customer_company 
ON google_ads_accounts(google_customer_id, company_id);