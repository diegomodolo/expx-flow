-- Add UTM tracking columns to lead_master_pool table
ALTER TABLE lead_master_pool
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Add index for common UTM queries
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_utm_source ON lead_master_pool(utm_source);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_utm_campaign ON lead_master_pool(utm_campaign);