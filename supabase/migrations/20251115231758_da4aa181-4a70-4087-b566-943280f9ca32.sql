-- Add unique constraint to company_id in google_ads_integrations
-- This allows upsert operations to work correctly when reconnecting Google Ads
ALTER TABLE google_ads_integrations 
ADD CONSTRAINT google_ads_integrations_company_id_key 
UNIQUE (company_id);

-- Add index for better performance on company_id lookups
CREATE INDEX IF NOT EXISTS idx_google_ads_integrations_company_id 
ON google_ads_integrations(company_id);