
-- Add task type column with predefined options
ALTER TABLE public.tasks 
ADD COLUMN task_type text NOT NULL DEFAULT 'Tarefa'
CHECK (task_type IN ('Backlog', 'Criativo', 'História', 'Negócio', 'Reunião', 'Tarefa', 'Ticket'));
