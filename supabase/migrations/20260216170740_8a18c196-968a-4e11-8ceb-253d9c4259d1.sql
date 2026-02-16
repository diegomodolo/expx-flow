
CREATE TABLE public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_avatar TEXT,
  history_type TEXT NOT NULL CHECK (history_type IN ('automatic', 'manual')),
  description TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_company_id ON public.task_history(company_id);
CREATE INDEX idx_task_history_created_at ON public.task_history(created_at DESC);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task history in their company"
  ON public.task_history FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert task history"
  ON public.task_history FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own manual history"
  ON public.task_history FOR UPDATE
  USING (
    history_type = 'manual' AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own manual history"
  ON public.task_history FOR DELETE
  USING (
    history_type = 'manual' AND user_id = auth.uid()
  );
