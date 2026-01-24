-- Add conversion_event column to ad_sets table
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS conversion_event TEXT;