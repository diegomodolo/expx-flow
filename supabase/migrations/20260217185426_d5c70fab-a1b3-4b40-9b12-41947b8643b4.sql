
-- Table for work schedule templates
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  work_start TIME NOT NULL DEFAULT '08:00',
  lunch_start TIME NOT NULL DEFAULT '12:00',
  lunch_end TIME NOT NULL DEFAULT '13:00',
  work_end TIME NOT NULL DEFAULT '17:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view work schedules of their company"
ON public.work_schedules FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create work schedules for their company"
ON public.work_schedules FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update work schedules of their company"
ON public.work_schedules FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete work schedules of their company"
ON public.work_schedules FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

-- Add work_schedule_id to employees table
ALTER TABLE public.employees 
ADD COLUMN work_schedule_id UUID REFERENCES public.work_schedules(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_work_schedules_company ON public.work_schedules(company_id);
CREATE INDEX idx_employees_work_schedule ON public.employees(work_schedule_id);
