-- Add missing cpm column to period_comparison_campaigns table
ALTER TABLE period_comparison_campaigns 
ADD COLUMN cpm NUMERIC DEFAULT 0;