-- Release Notes table
CREATE TABLE IF NOT EXISTS public.release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feature', 'fix', 'improvement', 'other')),
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('commit', 'pr')),
  source_ref TEXT NOT NULL UNIQUE,
  source_url TEXT,
  author_name TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_release_notes_published_at ON public.release_notes (published_at DESC);;



-- Enable RLS
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read release notes"
  ON public.release_notes
  FOR SELECT
  TO authenticated
  USING (true);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- GRANT permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_notes TO authenticated;