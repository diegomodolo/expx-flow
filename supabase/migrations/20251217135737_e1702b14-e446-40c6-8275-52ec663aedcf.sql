-- Enum para frequência de rotinas
CREATE TYPE routine_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Enum para categoria de rotinas
CREATE TYPE routine_category AS ENUM ('saldo', 'campanhas', 'performance', 'criativos', 'alertas', 'relatorios', 'otimizacao', 'outros');

-- Enum para status de execução
CREATE TYPE routine_execution_status AS ENUM ('pending', 'completed_on_time', 'completed_late', 'skipped');

-- Tabela de templates de rotinas
CREATE TABLE public.routine_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency routine_frequency NOT NULL DEFAULT 'daily',
  category routine_category NOT NULL DEFAULT 'outros',
  default_time TIME NOT NULL DEFAULT '09:00',
  priority task_priority NOT NULL DEFAULT 'medium',
  day_of_week INTEGER, -- 0-6 para rotinas semanais (domingo=0)
  day_of_month INTEGER, -- 1-31 para rotinas mensais
  sla_minutes INTEGER DEFAULT 60, -- tempo limite para conclusão em minutos
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false, -- templates pré-configurados do sistema
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de execuções de rotinas
CREATE TABLE public.routine_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.routine_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status routine_execution_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  time_spent_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_routine_templates_company ON public.routine_templates(company_id);
CREATE INDEX idx_routine_templates_active ON public.routine_templates(company_id, is_active);
CREATE INDEX idx_routine_executions_company_date ON public.routine_executions(company_id, scheduled_date);
CREATE INDEX idx_routine_executions_template ON public.routine_executions(template_id);
CREATE INDEX idx_routine_executions_employee ON public.routine_executions(employee_id);
CREATE INDEX idx_routine_executions_status ON public.routine_executions(company_id, status, scheduled_date);

-- Constraint única para evitar duplicatas de execução
CREATE UNIQUE INDEX idx_routine_executions_unique ON public.routine_executions(template_id, scheduled_date);

-- Enable RLS
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_executions ENABLE ROW LEVEL SECURITY;

-- Policies para routine_templates
CREATE POLICY "Users can view routine templates from their company"
ON public.routine_templates FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create routine templates for their company"
ON public.routine_templates FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update routine templates from their company"
ON public.routine_templates FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete routine templates from their company"
ON public.routine_templates FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())) AND is_system = false);

-- Policies para routine_executions
CREATE POLICY "Users can view routine executions from their company"
ON public.routine_executions FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create routine executions for their company"
ON public.routine_executions FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update routine executions from their company"
ON public.routine_executions FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete routine executions from their company"
ON public.routine_executions FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Trigger para updated_at
CREATE TRIGGER update_routine_templates_updated_at
  BEFORE UPDATE ON public.routine_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routine_executions_updated_at
  BEFORE UPDATE ON public.routine_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar execuções diárias automaticamente
CREATE OR REPLACE FUNCTION public.create_daily_routine_executions(p_company_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  template_record RECORD;
  inserted_count INTEGER := 0;
  target_day_of_week INTEGER;
  target_day_of_month INTEGER;
BEGIN
  target_day_of_week := EXTRACT(DOW FROM p_date);
  target_day_of_month := EXTRACT(DAY FROM p_date);
  
  FOR template_record IN 
    SELECT * FROM routine_templates 
    WHERE company_id = p_company_id 
      AND is_active = true
      AND (
        (frequency = 'daily') OR
        (frequency = 'weekly' AND day_of_week = target_day_of_week) OR
        (frequency = 'monthly' AND day_of_month = target_day_of_month)
      )
  LOOP
    INSERT INTO routine_executions (
      template_id,
      company_id,
      scheduled_date,
      scheduled_time,
      due_at,
      status
    ) VALUES (
      template_record.id,
      p_company_id,
      p_date,
      template_record.default_time,
      (p_date + template_record.default_time)::TIMESTAMP WITH TIME ZONE + (template_record.sla_minutes || ' minutes')::INTERVAL,
      'pending'
    )
    ON CONFLICT (template_id, scheduled_date) DO NOTHING;
    
    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  
  RETURN inserted_count;
END;
$$;