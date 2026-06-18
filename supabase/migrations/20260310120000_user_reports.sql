-- Create user_reports table
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  user_name TEXT NOT NULL DEFAULT '',
  github_issue_number INTEGER,
  github_issue_url TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'implementado', 'recusado')),
  claude_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);;

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_reports_company_id ON public.user_reports(company_id);;

CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON public.user_reports(user_id);;

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);;



-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view reports from their company"
ON public.user_reports
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own reports"
ON public.user_reports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- UPDATE: only service_role (Edge Functions) can update
-- No user-level UPDATE policy = users cannot update

-- DELETE: not allowed
-- No DELETE policy = users cannot delete

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_user_reports_updated_at ON public.user_reports;
CREATE TRIGGER trigger_update_user_reports_updated_at
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reports_updated_at();
