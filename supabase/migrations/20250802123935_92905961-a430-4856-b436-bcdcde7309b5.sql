-- Criar tabela para slots de tempo do planner
CREATE TABLE public.planner_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para tarefas do planner diário
CREATE TABLE public.planner_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  task_id UUID NOT NULL,
  time_slot_id UUID NOT NULL,
  planned_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para configuração de rodízio de clientes
CREATE TABLE public.client_rotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  day_sequence INTEGER NOT NULL,
  start_client_position INTEGER NOT NULL,
  end_client_position INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para histórico de otimizações
CREATE TABLE public.optimization_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  client_id UUID NOT NULL,
  task_id UUID,
  optimization_type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  results TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para todas as tabelas
ALTER TABLE public.planner_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para planner_time_slots
CREATE POLICY "Company members can view time slots"
  ON public.planner_time_slots FOR SELECT
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company admins can create time slots"
  ON public.planner_time_slots FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
  ));

CREATE POLICY "Company admins can update time slots"
  ON public.planner_time_slots FOR UPDATE
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
  ));

CREATE POLICY "Company admins can delete time slots"
  ON public.planner_time_slots FOR DELETE
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
  ));

-- Políticas RLS para planner_daily_tasks
CREATE POLICY "Company members can view daily tasks"
  ON public.planner_daily_tasks FOR SELECT
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can create daily tasks"
  ON public.planner_daily_tasks FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can update daily tasks"
  ON public.planner_daily_tasks FOR UPDATE
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can delete daily tasks"
  ON public.planner_daily_tasks FOR DELETE
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

-- Políticas RLS para client_rotations
CREATE POLICY "Company admins can manage client rotations"
  ON public.client_rotations FOR ALL
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
  ));

-- Políticas RLS para optimization_history
CREATE POLICY "Company members can view optimization history"
  ON public.optimization_history FOR SELECT
  USING (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

CREATE POLICY "Company members can create optimization history"
  ON public.optimization_history FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
  ));

-- Triggers para updated_at
CREATE TRIGGER update_planner_time_slots_updated_at
  BEFORE UPDATE ON public.planner_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_daily_tasks_updated_at
  BEFORE UPDATE ON public.planner_daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_rotations_updated_at
  BEFORE UPDATE ON public.client_rotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_planner_time_slots_company_id ON public.planner_time_slots(company_id);
CREATE INDEX idx_planner_time_slots_display_order ON public.planner_time_slots(display_order);
CREATE INDEX idx_planner_daily_tasks_company_id ON public.planner_daily_tasks(company_id);
CREATE INDEX idx_planner_daily_tasks_planned_date ON public.planner_daily_tasks(planned_date);
CREATE INDEX idx_planner_daily_tasks_time_slot_id ON public.planner_daily_tasks(time_slot_id);
CREATE INDEX idx_client_rotations_company_id ON public.client_rotations(company_id);
CREATE INDEX idx_optimization_history_company_id ON public.optimization_history(company_id);
CREATE INDEX idx_optimization_history_client_id ON public.optimization_history(client_id);