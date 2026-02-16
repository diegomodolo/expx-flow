-- Add quadro_column_id and etapa columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS quadro_column_id UUID REFERENCES public.task_board_columns(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS etapa TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_quadro_column_id ON public.tasks(quadro_column_id);