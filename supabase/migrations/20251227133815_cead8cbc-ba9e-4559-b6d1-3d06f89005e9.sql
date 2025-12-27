-- Add max_days column to crm_stages for SLA configuration
ALTER TABLE public.crm_stages 
ADD COLUMN max_days INTEGER DEFAULT NULL;

-- Add stage_entered_at column to crm_deals to track when deal entered current stage
ALTER TABLE public.crm_deals 
ADD COLUMN stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing deals to set stage_entered_at to their created_at or updated_at
UPDATE public.crm_deals 
SET stage_entered_at = COALESCE(updated_at, created_at)
WHERE stage_entered_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.crm_stages.max_days IS 'Maximum days a deal can stay in this stage before SLA breach';
COMMENT ON COLUMN public.crm_deals.stage_entered_at IS 'Timestamp when deal entered current stage';