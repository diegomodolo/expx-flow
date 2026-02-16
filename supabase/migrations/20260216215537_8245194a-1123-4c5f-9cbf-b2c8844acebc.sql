
-- Create table for task flow configurations
CREATE TABLE public.task_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Novo Fluxo',
  description TEXT,
  flow_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_flows ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view task flows from their company"
ON public.task_flows FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create task flows for their company"
ON public.task_flows FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update task flows from their company"
ON public.task_flows FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete task flows from their company"
ON public.task_flows FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_task_flows_updated_at
BEFORE UPDATE ON public.task_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
