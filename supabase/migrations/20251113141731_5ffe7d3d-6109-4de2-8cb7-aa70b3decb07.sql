-- Create automation_execution_logs table formally
CREATE TABLE IF NOT EXISTS public.automation_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  actions_taken INTEGER DEFAULT 0,
  total_rules_evaluated INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  execution_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_company 
  ON public.automation_execution_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_client 
  ON public.automation_execution_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_started_at 
  ON public.automation_execution_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_execution_id 
  ON public.automation_execution_logs(execution_id);

-- Enable RLS
ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company members can view execution logs" ON public.automation_execution_logs;
DROP POLICY IF EXISTS "System can create execution logs" ON public.automation_execution_logs;
DROP POLICY IF EXISTS "System can update execution logs" ON public.automation_execution_logs;

-- Create RLS policies
CREATE POLICY "Company members can view execution logs"
  ON public.automation_execution_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create execution logs"
  ON public.automation_execution_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update execution logs"
  ON public.automation_execution_logs FOR UPDATE
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.automation_execution_logs IS 'Logs de execução do sistema de automação mestre (Cron Master)';
COMMENT ON COLUMN public.automation_execution_logs.execution_id IS 'ID único da execução do cron';
COMMENT ON COLUMN public.automation_execution_logs.status IS 'Status da execução: running, completed, failed, partial';
COMMENT ON COLUMN public.automation_execution_logs.actions_taken IS 'Número de ações executadas durante a automação';
COMMENT ON COLUMN public.automation_execution_logs.total_rules_evaluated IS 'Total de regras avaliadas na execução';