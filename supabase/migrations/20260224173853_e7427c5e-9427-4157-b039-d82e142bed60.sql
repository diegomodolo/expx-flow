ALTER TABLE public.clip_jobs
ADD COLUMN IF NOT EXISTS max_duration_seconds integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS time_start_seconds integer,
ADD COLUMN IF NOT EXISTS time_end_seconds integer,
ADD COLUMN IF NOT EXISTS context_description text;