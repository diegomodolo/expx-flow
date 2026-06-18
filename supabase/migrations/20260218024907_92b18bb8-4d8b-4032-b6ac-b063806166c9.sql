-- Table for Google Meet/Drive OAuth integration (separate from Google Ads)
CREATE TABLE IF NOT EXISTS public.google_meet_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT google_meet_integrations_company_id_key UNIQUE (company_id)
);;



-- Enable RLS
ALTER TABLE public.google_meet_integrations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Members can view their company Meet integration"
  ON public.google_meet_integrations FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can insert Meet integration"
  ON public.google_meet_integrations FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can update Meet integration"
  ON public.google_meet_integrations FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS update_google_meet_integrations_updated_at ON public.google_meet_integrations;
CREATE TRIGGER update_google_meet_integrations_updated_at
  BEFORE UPDATE ON public.google_meet_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_youtube_updated_at();
