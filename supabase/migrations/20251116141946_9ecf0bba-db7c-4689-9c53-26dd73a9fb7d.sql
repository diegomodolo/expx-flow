-- Add user_email column to google_ads_integrations
ALTER TABLE google_ads_integrations
ADD COLUMN IF NOT EXISTS user_email text;