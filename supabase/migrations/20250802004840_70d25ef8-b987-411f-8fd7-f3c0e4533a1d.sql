-- Add objective column to campaigns table
ALTER TABLE campaigns ADD COLUMN objective TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN campaigns.objective IS 'Facebook campaign objective (e.g., REACH, BRAND_AWARENESS, VIDEO_VIEWS, LEAD_GENERATION, etc.)';