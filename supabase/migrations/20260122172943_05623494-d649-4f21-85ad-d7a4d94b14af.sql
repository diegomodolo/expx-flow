-- Add active_days_of_week column for daily recurrence filtering
-- Array of integers: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Default: all days enabled [0,1,2,3,4,5,6]
ALTER TABLE public.recurring_task_templates 
ADD COLUMN IF NOT EXISTS active_days_of_week integer[] DEFAULT ARRAY[0,1,2,3,4,5,6];

-- Add comment for documentation
COMMENT ON COLUMN public.recurring_task_templates.active_days_of_week IS 'Days of week when daily tasks should be generated. 0=Sunday, 1=Monday, ..., 6=Saturday. Only used when recurrence_type=daily.';