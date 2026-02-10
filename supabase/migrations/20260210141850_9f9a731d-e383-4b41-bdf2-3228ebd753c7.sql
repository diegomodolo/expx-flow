
-- Add structured scheduling fields and instance_id to groupops_campaigns
ALTER TABLE public.groupops_campaigns
  ADD COLUMN IF NOT EXISTS schedule_frequency text DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS schedule_times text[] DEFAULT '{09:00}',
  ADD COLUMN IF NOT EXISTS schedule_days_of_week int[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_day_of_month int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_execution_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_execution_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instance_id uuid DEFAULT NULL REFERENCES public.whatsapp_instances(id);

-- Add index for cron lookups
CREATE INDEX IF NOT EXISTS idx_groupops_campaigns_next_exec 
  ON public.groupops_campaigns (next_execution_at) 
  WHERE status = 'active' AND next_execution_at IS NOT NULL;

COMMENT ON COLUMN public.groupops_campaigns.schedule_frequency IS 'daily, weekly, or monthly';
COMMENT ON COLUMN public.groupops_campaigns.schedule_times IS 'Array of HH:MM times (São Paulo timezone)';
COMMENT ON COLUMN public.groupops_campaigns.schedule_days_of_week IS 'Array of weekday numbers (0=Sunday..6=Saturday) for weekly campaigns';
COMMENT ON COLUMN public.groupops_campaigns.schedule_day_of_month IS 'Day of month (1-31) for monthly campaigns';
COMMENT ON COLUMN public.groupops_campaigns.instance_id IS 'WhatsApp instance to use for sending';
