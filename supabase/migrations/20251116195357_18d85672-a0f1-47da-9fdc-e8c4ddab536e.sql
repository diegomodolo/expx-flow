-- Adicionar coluna para dia de recarga (1-31) na tabela facebook_ad_accounts
ALTER TABLE facebook_ad_accounts 
ADD COLUMN IF NOT EXISTS recharge_day INTEGER;

-- Adicionar constraint para validar o range (1-31)
ALTER TABLE facebook_ad_accounts
ADD CONSTRAINT check_recharge_day_range 
CHECK (recharge_day IS NULL OR (recharge_day >= 1 AND recharge_day <= 31));

-- Comentário na coluna
COMMENT ON COLUMN facebook_ad_accounts.recharge_day IS 
'Dia do mês em que o cliente recarrega o saldo (1-31). NULL = usar final do mês como padrão';