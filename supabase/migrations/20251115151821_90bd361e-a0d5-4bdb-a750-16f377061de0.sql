-- Criar tabela para configurações de sincronização do Facebook
CREATE TABLE IF NOT EXISTS public.facebook_sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_options JSONB NOT NULL DEFAULT '{
    "period": "30",
    "campaigns": true,
    "adsets": true,
    "ads": true,
    "includeInactive": false
  }'::jsonb,
  scheduled_times TEXT[] NOT NULL DEFAULT ARRAY['09:00'],
  executions_per_day INTEGER NOT NULL DEFAULT 1,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Criar tabela para logs de execução
CREATE TABLE IF NOT EXISTS public.facebook_sync_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.facebook_sync_schedules(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  clients_processed INTEGER DEFAULT 0,
  clients_total INTEGER DEFAULT 0,
  sync_options JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_details JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_facebook_sync_schedules_company ON public.facebook_sync_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_facebook_sync_schedules_next_execution ON public.facebook_sync_schedules(next_execution_at) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_facebook_sync_execution_logs_company ON public.facebook_sync_execution_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_facebook_sync_execution_logs_schedule ON public.facebook_sync_execution_logs(schedule_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_facebook_sync_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facebook_sync_schedules_timestamp
  BEFORE UPDATE ON public.facebook_sync_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_sync_schedules_updated_at();

-- RLS Policies para facebook_sync_schedules
ALTER TABLE public.facebook_sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sync schedules"
  ON public.facebook_sync_schedules
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can manage sync schedules"
  ON public.facebook_sync_schedules
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies para facebook_sync_execution_logs
ALTER TABLE public.facebook_sync_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view execution logs"
  ON public.facebook_sync_execution_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert execution logs"
  ON public.facebook_sync_execution_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update execution logs"
  ON public.facebook_sync_execution_logs
  FOR UPDATE
  USING (true);