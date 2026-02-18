
-- Table to store task output/result messages (chat-like)
CREATE TABLE public.task_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL DEFAULT '',
  author_avatar TEXT,
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_task_outputs_task_id ON public.task_outputs(task_id);

-- Enable RLS
ALTER TABLE public.task_outputs ENABLE ROW LEVEL SECURITY;

-- Policies: company members can CRUD
CREATE POLICY "Users can view task outputs in their company"
  ON public.task_outputs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create task outputs in their company"
  ON public.task_outputs FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own task outputs"
  ON public.task_outputs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own task outputs"
  ON public.task_outputs FOR DELETE
  USING (user_id = auth.uid());

-- Service role policy for AI agents
CREATE POLICY "Service role full access to task_outputs"
  ON public.task_outputs FOR ALL
  USING (auth.role() = 'service_role');

-- Create storage bucket for task output attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-output-files', 'task-output-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company members can upload task output files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-output-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view task output files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-output-files');

CREATE POLICY "Users can delete their own task output files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-output-files' AND auth.uid()::text = (storage.foldername(name))[1]);
