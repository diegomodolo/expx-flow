-- Create team_notes table for team communication
CREATE TABLE IF NOT EXISTS public.team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);;



-- Enable RLS
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view notes from their company"
ON public.team_notes
FOR SELECT
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create notes in their company"
ON public.team_notes
FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own notes"
ON public.team_notes
FOR UPDATE
USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own notes"
ON public.team_notes
FOR DELETE
USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_notes_company_id ON public.team_notes(company_id);;

CREATE INDEX IF NOT EXISTS idx_team_notes_created_at ON public.team_notes(created_at DESC);;

DROP TRIGGER IF EXISTS update_team_notes_updated_at ON public.team_notes;
CREATE TRIGGER update_team_notes_updated_at
BEFORE UPDATE ON public.team_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
