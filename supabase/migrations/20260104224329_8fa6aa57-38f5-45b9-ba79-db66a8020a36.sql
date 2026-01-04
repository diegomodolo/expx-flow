-- Create team_notes table for team communication
CREATE TABLE public.team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view notes from their company"
ON public.team_notes
FOR SELECT
USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create notes in their company"
ON public.team_notes
FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own notes"
ON public.team_notes
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
ON public.team_notes
FOR DELETE
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_team_notes_company_id ON public.team_notes(company_id);
CREATE INDEX idx_team_notes_created_at ON public.team_notes(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_team_notes_updated_at
BEFORE UPDATE ON public.team_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();