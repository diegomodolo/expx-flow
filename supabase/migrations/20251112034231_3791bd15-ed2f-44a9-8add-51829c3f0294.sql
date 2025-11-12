-- Criar tabela de log de execução de snapshots
CREATE TABLE IF NOT EXISTS public.snapshot_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_date DATE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  clients_processed INT DEFAULT 0,
  campaigns_processed INT DEFAULT 0,
  adsets_processed INT DEFAULT 0,
  ads_processed INT DEFAULT 0,
  snapshots_created INT DEFAULT 0,
  errors_count INT DEFAULT 0,
  error_messages TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshot_log_date ON public.snapshot_execution_log(execution_date DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_log_status ON public.snapshot_execution_log(status);

-- Habilitar RLS
ALTER TABLE public.snapshot_execution_log ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura por membros da empresa
CREATE POLICY "Users can view snapshot logs"
  ON public.snapshot_execution_log
  FOR SELECT
  USING (true);

-- Permitir insert/update apenas pelo sistema (service role)
CREATE POLICY "Service role can manage snapshot logs"
  ON public.snapshot_execution_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');