
-- Create time tracking sessions table
CREATE TABLE public.task_time_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes NUMERIC GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0
      ELSE NULL 
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_task_time_tracking_task_id ON public.task_time_tracking(task_id);
CREATE INDEX idx_task_time_tracking_user_id ON public.task_time_tracking(user_id);
CREATE INDEX idx_task_time_tracking_company_id ON public.task_time_tracking(company_id);

-- Enable RLS
ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view time tracking in their company
CREATE POLICY "Users can view time tracking in their company"
ON public.task_time_tracking
FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
);

-- RLS: Users can insert their own time tracking
CREATE POLICY "Users can insert their own time tracking"
ON public.task_time_tracking
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
);

-- RLS: Users can update their own time tracking
CREATE POLICY "Users can update their own time tracking"
ON public.task_time_tracking
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS: Users can delete their own time tracking
CREATE POLICY "Users can delete their own time tracking"
ON public.task_time_tracking
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
