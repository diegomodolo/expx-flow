-- Tabela de jobs de processamento de clipes
CREATE TABLE IF NOT EXISTS public.clip_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  client_id UUID REFERENCES public.clients(id),
  input_url TEXT,
  input_storage_path TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  progress INT DEFAULT 0,
  progress_message TEXT,
  error_message TEXT,
  video_duration_seconds INT,
  max_clips INT DEFAULT 3,
  format TEXT DEFAULT '9:16',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);;

-- Tabela de clipes gerados
CREATE TABLE IF NOT EXISTS public.clips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.clip_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  title TEXT,
  clip_type TEXT,
  virality_score INT,
  reason TEXT,
  start_seconds FLOAT,
  end_seconds FLOAT,
  duration_seconds FLOAT,
  storage_path TEXT,
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);;



-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE clip_jobs;

ALTER PUBLICATION supabase_realtime ADD TABLE clips;


-- Row Level Security
ALTER TABLE public.clip_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own company jobs" ON public.clip_jobs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users create own jobs" ON public.clip_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own jobs" ON public.clip_jobs
  FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users see own company clips" ON public.clips
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert clips" ON public.clips
  FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos-input', 'videos-input', false, 524288000)
ON CONFLICT (id) DO NOTHING;


INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('clips-output', 'clips-output', true, 209715200)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "Users upload own videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos-input' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos-input' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read clips output" ON storage.objects
  FOR SELECT USING (bucket_id = 'clips-output');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service upload clips output" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'clips-output');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_clip_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  RETURN NEW;

END;

$$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS update_clip_jobs_updated_at ON public.clip_jobs;
CREATE TRIGGER update_clip_jobs_updated_at
  BEFORE UPDATE ON public.clip_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clip_jobs_updated_at();
