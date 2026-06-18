
-- Add creative metadata to tasks
ALTER TABLE public.tasks 
ADD COLUMN creative_data jsonb DEFAULT NULL;
-- Table for creative file attachments
CREATE TABLE IF NOT EXISTS public.task_creative_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_name text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);;



ALTER TABLE public.task_creative_files ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view creative files of their company"
  ON public.task_creative_files FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert creative files for their company"
  ON public.task_creative_files FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update creative files of their company"
  ON public.task_creative_files FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete creative files of their company"
  ON public.task_creative_files FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('task-creatives', 'task-creatives', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload task creatives"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-creatives' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view task creatives"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-creatives');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update task creatives"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'task-creatives' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete task creatives"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-creatives' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
