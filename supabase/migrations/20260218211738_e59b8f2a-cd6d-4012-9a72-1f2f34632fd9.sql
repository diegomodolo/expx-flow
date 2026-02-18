-- Add ai_output column to tasks for storing agent execution results
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ai_output text;

-- Add index for finding agent-assigned tasks ready to execute
CREATE INDEX IF NOT EXISTS idx_tasks_agent_execution 
ON public.tasks (user_id, status, start_date) 
WHERE status = 'todo' AND start_date IS NOT NULL;