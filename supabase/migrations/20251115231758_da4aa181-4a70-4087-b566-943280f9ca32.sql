DO $$ BEGIN
  ALTER TABLE google_ads_integrations 
ADD CONSTRAINT google_ads_integrations_company_id_key 
UNIQUE (company_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Add index for better performance on company_id lookups
CREATE INDEX IF NOT EXISTS idx_google_ads_integrations_company_id 
ON google_ads_integrations(company_id);