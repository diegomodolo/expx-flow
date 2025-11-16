-- Add new columns to google_ads_accounts table to support MCC hierarchy and status
ALTER TABLE google_ads_accounts
ADD COLUMN IF NOT EXISTS is_manager boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ENABLED',
ADD COLUMN IF NOT EXISTS parent_customer_id text;

-- Add index for better query performance on parent_customer_id
CREATE INDEX IF NOT EXISTS idx_google_ads_accounts_parent_customer_id 
ON google_ads_accounts(parent_customer_id);

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_google_ads_accounts_status 
ON google_ads_accounts(status);

COMMENT ON COLUMN google_ads_accounts.is_manager IS 'Indicates if this is an MCC (Manager) account';
COMMENT ON COLUMN google_ads_accounts.status IS 'Account status from Google Ads (ENABLED, CANCELLED, etc)';
COMMENT ON COLUMN google_ads_accounts.parent_customer_id IS 'Parent MCC customer ID if this is a sub-account';