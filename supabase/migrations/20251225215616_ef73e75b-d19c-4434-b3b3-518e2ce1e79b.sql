-- Orçamentos por plataforma
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_monthly_budget numeric DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS google_monthly_budget numeric DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_monthly_budget numeric DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tiktok_monthly_budget numeric DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS twitter_monthly_budget numeric DEFAULT 0;

-- Tipo de pagamento por plataforma
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_payment_type text DEFAULT 'prepaid';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS google_payment_type text DEFAULT 'prepaid';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_payment_type text DEFAULT 'prepaid';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tiktok_payment_type text DEFAULT 'prepaid';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS twitter_payment_type text DEFAULT 'prepaid';

-- Dia de recarga por plataforma
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_recharge_day integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS google_recharge_day integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_recharge_day integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tiktok_recharge_day integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS twitter_recharge_day integer;

-- Migrar dados existentes para Meta (o orçamento genérico era usado para Meta)
UPDATE clients 
SET meta_monthly_budget = COALESCE(monthly_budget, 0),
    meta_payment_type = COALESCE(payment_type::text, 'prepaid')
WHERE meta_monthly_budget = 0 OR meta_monthly_budget IS NULL;