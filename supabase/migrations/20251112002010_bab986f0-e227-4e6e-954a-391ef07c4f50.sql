-- Add facebook_id column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS facebook_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_facebook_id ON campaigns(facebook_id);

-- Add comment for documentation
COMMENT ON COLUMN campaigns.facebook_id IS 'Facebook Campaign ID from Meta Ads API';