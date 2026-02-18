
-- Tabela google_meet_meetings
CREATE TABLE public.google_meet_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  squad_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  google_space_id TEXT NOT NULL DEFAULT '',
  meeting_uri TEXT NOT NULL DEFAULT '',
  meeting_code TEXT NOT NULL DEFAULT '',
  conference_record_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  transcript_status TEXT NOT NULL DEFAULT 'pending',
  raw_transcript TEXT,
  ai_summary TEXT,
  ai_action_items JSONB,
  transcript_doc_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela google_meet_participants
CREATE TABLE public.google_meet_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.google_meet_meetings(id) ON DELETE CASCADE,
  user_id UUID,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_meet_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_meet_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_meet_meetings
CREATE POLICY "Members can view company meetings"
  ON public.google_meet_meetings FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create company meetings"
  ON public.google_meet_meetings FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update company meetings"
  ON public.google_meet_meetings FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can delete company meetings"
  ON public.google_meet_meetings FOR DELETE
  USING (public.is_company_member(auth.uid(), company_id));

-- RLS policies for google_meet_participants
CREATE POLICY "Members can view meeting participants"
  ON public.google_meet_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.google_meet_meetings m
    WHERE m.id = meeting_id AND public.is_company_member(auth.uid(), m.company_id)
  ));

CREATE POLICY "Members can manage meeting participants"
  ON public.google_meet_participants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.google_meet_meetings m
    WHERE m.id = meeting_id AND public.is_company_member(auth.uid(), m.company_id)
  ));

-- Trigger para updated_at
CREATE TRIGGER update_google_meet_meetings_updated_at
  BEFORE UPDATE ON public.google_meet_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sync_jobs_updated_at();

-- Indexes
CREATE INDEX idx_google_meet_meetings_company_id ON public.google_meet_meetings(company_id);
CREATE INDEX idx_google_meet_meetings_client_id ON public.google_meet_meetings(client_id);
CREATE INDEX idx_google_meet_meetings_status ON public.google_meet_meetings(status);
CREATE INDEX idx_google_meet_participants_meeting_id ON public.google_meet_participants(meeting_id);
