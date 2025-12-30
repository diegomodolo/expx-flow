-- Create recurring_task_templates table
CREATE TABLE public.recurring_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to UUID NOT NULL,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  days_before_visible INTEGER NOT NULL DEFAULT 0,
  days_to_complete INTEGER NOT NULL DEFAULT 1,
  next_generation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_board_permissions table
CREATE TABLE public.employee_board_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  can_view_others_boards BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Add new columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES public.recurring_task_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS visibility_date DATE,
ADD COLUMN IF NOT EXISTS assigned_user_id UUID;

-- Enable RLS
ALTER TABLE public.recurring_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_board_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_task_templates
CREATE POLICY "Users can view recurring templates from their company"
ON public.recurring_task_templates
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create recurring templates in their company"
ON public.recurring_task_templates
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recurring templates in their company"
ON public.recurring_task_templates
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete recurring templates in their company"
ON public.recurring_task_templates
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for employee_board_permissions
CREATE POLICY "Users can view board permissions from their company"
ON public.employee_board_permissions
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage board permissions in their company"
ON public.employee_board_permissions
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_recurring_templates_company ON public.recurring_task_templates(company_id);
CREATE INDEX idx_recurring_templates_client ON public.recurring_task_templates(client_id);
CREATE INDEX idx_recurring_templates_assigned ON public.recurring_task_templates(assigned_to);
CREATE INDEX idx_recurring_templates_next_gen ON public.recurring_task_templates(next_generation_date) WHERE is_active = true;
CREATE INDEX idx_tasks_assigned_user ON public.tasks(assigned_user_id);
CREATE INDEX idx_tasks_visibility_date ON public.tasks(visibility_date);
CREATE INDEX idx_tasks_recurring_template ON public.tasks(recurring_template_id);

-- Trigger for updated_at on recurring_task_templates
CREATE TRIGGER update_recurring_task_templates_updated_at
BEFORE UPDATE ON public.recurring_task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on employee_board_permissions
CREATE TRIGGER update_employee_board_permissions_updated_at
BEFORE UPDATE ON public.employee_board_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();