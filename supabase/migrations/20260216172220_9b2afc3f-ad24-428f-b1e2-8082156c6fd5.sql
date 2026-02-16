
-- Add parent_task_id column to tasks table for subtask hierarchy
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index for efficient subtask lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- Add task_type column if not exists
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Tarefa';
