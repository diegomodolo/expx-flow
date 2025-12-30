-- Add new columns for specific recurrence settings
ALTER TABLE public.recurring_task_templates
ADD COLUMN IF NOT EXISTS day_of_week integer, -- 0=Sunday, 1=Monday, ..., 6=Saturday
ADD COLUMN IF NOT EXISTS day_of_month integer, -- 1-31
ADD COLUMN IF NOT EXISTS month_of_year integer; -- 1-12

-- Add comments for documentation
COMMENT ON COLUMN public.recurring_task_templates.day_of_week IS 'Day of week for weekly recurrence (0=Sunday, 1=Monday, ..., 6=Saturday)';
COMMENT ON COLUMN public.recurring_task_templates.day_of_month IS 'Day of month for monthly/yearly recurrence (1-31)';
COMMENT ON COLUMN public.recurring_task_templates.month_of_year IS 'Month of year for yearly recurrence (1-12)';