
-- Create task_state enum type
DO $$ BEGIN
  CREATE TYPE public.task_state AS ENUM ('backlog', 'planejamento', 'execucao');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add task_state column with default 'execucao' (most existing tasks are in production)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_state public.task_state NOT NULL DEFAULT 'execucao';

-- Migrate existing data: tasks with task_type='Backlog' go to backlog state
UPDATE public.tasks SET task_state = 'backlog' WHERE task_type = 'Backlog';

-- Tasks with status='todo' and no start_date that aren't already backlog go to planejamento
UPDATE public.tasks SET task_state = 'planejamento' 
WHERE task_state = 'execucao' AND status = 'todo' AND start_date IS NULL AND task_type != 'Backlog';

-- Clean up: change task_type from 'Backlog' to 'Tarefa' since Backlog is now a state
UPDATE public.tasks SET task_type = 'Tarefa' WHERE task_type = 'Backlog';

-- Add index for filtering by state
CREATE INDEX IF NOT EXISTS idx_tasks_task_state ON public.tasks (task_state);
CREATE INDEX IF NOT EXISTS idx_tasks_company_state ON public.tasks (company_id, task_state);
