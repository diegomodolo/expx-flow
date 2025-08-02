-- Remover sistema de planner_daily_tasks e triggers relacionados

-- Remover trigger que associa tarefas automaticamente ao planner
DROP TRIGGER IF EXISTS auto_associate_task_to_planner_trigger ON tasks;

-- Remover função de associação automática
DROP FUNCTION IF EXISTS public.auto_associate_task_to_planner();

-- Remover função de encontrar slot por data
DROP FUNCTION IF EXISTS public.find_time_slot_for_start_date(uuid, timestamp with time zone);

-- Remover tabela planner_daily_tasks
DROP TABLE IF EXISTS public.planner_daily_tasks;