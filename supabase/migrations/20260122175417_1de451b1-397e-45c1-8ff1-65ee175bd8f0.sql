-- Create task_board_columns table for custom Kanban column configurations
CREATE TABLE public.task_board_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'progress', 'review', 'done')),
  color TEXT NOT NULL DEFAULT '#6B7280',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_task_board_columns_user_company ON public.task_board_columns(user_id, company_id);

-- Enable Row Level Security
ALTER TABLE public.task_board_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own columns
CREATE POLICY "Users can view their own columns"
  ON public.task_board_columns
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own columns"
  ON public.task_board_columns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own columns"
  ON public.task_board_columns
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own columns"
  ON public.task_board_columns
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_task_board_columns_updated_at
  BEFORE UPDATE ON public.task_board_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();