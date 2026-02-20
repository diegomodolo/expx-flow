
-- Add rejection tracking fields to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS last_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tasks.last_rejected_at IS 'Timestamp da última rejeição da tarefa';
COMMENT ON COLUMN public.tasks.rejection_count IS 'Número total de rejeições da tarefa';
