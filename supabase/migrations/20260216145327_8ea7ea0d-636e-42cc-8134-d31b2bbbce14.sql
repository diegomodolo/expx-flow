
-- Create enum for task member roles
CREATE TYPE public.task_member_role AS ENUM ('responsible', 'contributor', 'observer');

-- Table to associate team members with tasks and their roles
CREATE TABLE public.task_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role task_member_role NOT NULL DEFAULT 'contributor',
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only one responsible per task
CREATE UNIQUE INDEX idx_task_members_responsible ON public.task_members(task_id) WHERE role = 'responsible';
-- Prevent duplicate employee-task-role combinations
CREATE UNIQUE INDEX idx_task_members_unique ON public.task_members(task_id, employee_id, role);
CREATE INDEX idx_task_members_task ON public.task_members(task_id);
CREATE INDEX idx_task_members_employee ON public.task_members(employee_id);

ALTER TABLE public.task_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task_members in their company"
  ON public.task_members FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert task_members in their company"
  ON public.task_members FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update task_members in their company"
  ON public.task_members FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete task_members in their company"
  ON public.task_members FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
