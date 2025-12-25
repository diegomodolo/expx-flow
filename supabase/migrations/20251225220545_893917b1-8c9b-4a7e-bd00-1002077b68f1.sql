-- Add daily_budget column to google_campaigns table
ALTER TABLE google_campaigns ADD COLUMN daily_budget numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN google_campaigns.daily_budget IS 'Daily budget in currency (converted from micros)';