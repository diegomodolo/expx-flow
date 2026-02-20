
-- 1. Add quality score to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_quality_score NUMERIC(5,2) NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.tasks.task_quality_score IS 'Qualidade da tarefa 0-100. Inicia em 100, reduz a cada rejeição pelo autorizador.';

-- 2. Create task_review_history table
CREATE TABLE IF NOT EXISTS public.task_review_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reviewer_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  rejection_reason TEXT CHECK (rejection_reason IN ('very_bad', 'bad', 'adjustments')),
  quality_before NUMERIC(5,2) NOT NULL,
  quality_after NUMERIC(5,2) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_review_history_task_id ON public.task_review_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_review_history_company_id ON public.task_review_history(company_id);
CREATE INDEX IF NOT EXISTS idx_task_review_history_reviewer ON public.task_review_history(reviewer_employee_id);

ALTER TABLE public.task_review_history ENABLE ROW LEVEL SECURITY;

-- RLS: company employees can view review history
CREATE POLICY "Company employees can view task review history"
  ON public.task_review_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
      AND e.company_id = task_review_history.company_id
    )
  );

-- RLS: company employees can insert review history
CREATE POLICY "Company employees can insert task review history"
  ON public.task_review_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
      AND e.company_id = task_review_history.company_id
    )
  );

-- 3. Add notify_task_review to discord_config
ALTER TABLE public.discord_config
  ADD COLUMN IF NOT EXISTS notify_task_review BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.discord_config
  ADD COLUMN IF NOT EXISTS notify_task_rejected BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.discord_config.notify_task_review IS 'Notifica quando tarefa vai para revisão (alerta para autorizador)';
COMMENT ON COLUMN public.discord_config.notify_task_rejected IS 'Notifica o responsável quando uma tarefa é rejeitada';
