-- Adicionar novo enum para origem da tarefa se não existir
DO $$ BEGIN
    CREATE TYPE task_origin AS ENUM ('dashboard', 'manual', 'automation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar campos necessários à tabela tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS origin task_origin DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS related_campaign_id uuid,
ADD COLUMN IF NOT EXISTS related_client_id uuid,
ADD COLUMN IF NOT EXISTS alert_id text,
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_tasks_origin ON public.tasks(origin);
CREATE INDEX IF NOT EXISTS idx_tasks_related_campaign ON public.tasks(related_campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_client ON public.tasks(related_client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON public.tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Função para criar tarefas automáticas baseadas em alertas
CREATE OR REPLACE FUNCTION public.create_task_from_alert(
  _company_id uuid,
  _alert_type text,
  _alert_description text,
  _related_campaign_id uuid DEFAULT NULL,
  _related_client_id uuid DEFAULT NULL,
  _alert_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _task_id uuid;
  _title text;
  _priority task_priority;
  _due_date timestamp with time zone;
  _team_id uuid;
  _responsible_user_id uuid;
BEGIN
  -- Determinar título baseado no tipo de alerta
  CASE _alert_type
    WHEN 'high_cpa' THEN 
      _title := 'Otimizar CPA Alto';
      _priority := 'high';
    WHEN 'low_performance' THEN 
      _title := 'Revisar Performance Baixa';
      _priority := 'high';
    WHEN 'budget_exceeded' THEN 
      _title := 'Budget Excedido - Ação Necessária';
      _priority := 'high';
    WHEN 'scale_opportunity' THEN 
      _title := 'Oportunidade de Escalar Campanha';
      _priority := 'medium';
    ELSE 
      _title := 'Ação Necessária';
      _priority := 'medium';
  END CASE;

  -- Definir prazo baseado na prioridade
  _due_date := CASE _priority
    WHEN 'high' THEN now() + interval '1 day'
    WHEN 'medium' THEN now() + interval '3 days'
    ELSE now() + interval '7 days'
  END;

  -- Buscar equipe responsável (primeira equipe da empresa)
  SELECT id INTO _team_id 
  FROM teams 
  WHERE company_id = _company_id 
  LIMIT 1;

  -- Buscar responsável (primeiro membro da equipe ou admin da empresa)
  SELECT user_id INTO _responsible_user_id
  FROM company_members
  WHERE company_id = _company_id
    AND role IN ('owner', 'admin')
  LIMIT 1;

  -- Criar a tarefa
  INSERT INTO tasks (
    title,
    description,
    status,
    priority,
    team_id,
    user_id,
    company_id,
    responsible_name,
    origin,
    related_campaign_id,
    related_client_id,
    alert_id,
    due_date,
    deadline,
    progress
  ) VALUES (
    _title,
    _alert_description,
    'todo',
    _priority,
    _team_id,
    _responsible_user_id,
    _company_id,
    (SELECT full_name FROM profiles WHERE user_id = _responsible_user_id LIMIT 1),
    'automation',
    _related_campaign_id,
    _related_client_id,
    _alert_id,
    _due_date,
    _due_date::date,
    0
  ) RETURNING id INTO _task_id;

  RETURN _task_id;
END;
$$;

-- Função para atualizar progresso de tarefas
CREATE OR REPLACE FUNCTION public.update_task_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Se status mudou para concluído, definir progresso como 100% e data de conclusão
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.progress := 100;
    NEW.completed_at := now();
  END IF;

  -- Se status mudou de concluído para outro, remover data de conclusão
  IF OLD.status = 'done' AND NEW.status != 'done' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar progresso automaticamente
DROP TRIGGER IF EXISTS update_task_progress_trigger ON public.tasks;
CREATE TRIGGER update_task_progress_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_progress();

-- Criar view para estatísticas de tarefas (usando os valores corretos do enum)
CREATE OR REPLACE VIEW public.task_stats AS
SELECT 
  company_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'todo') as pending_tasks,
  COUNT(*) FILTER (WHERE status = 'progress') as in_progress_tasks,
  COUNT(*) FILTER (WHERE status = 'review') as review_tasks,
  COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
  COUNT(*) FILTER (WHERE due_date < now() AND status != 'done') as overdue_tasks,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_days
FROM public.tasks
GROUP BY company_id;