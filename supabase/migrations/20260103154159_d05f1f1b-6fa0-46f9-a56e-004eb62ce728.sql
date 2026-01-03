-- Create table for ad generation history
CREATE TABLE public.ad_generation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.ad_generation_schedules(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ads_requested INTEGER NOT NULL DEFAULT 0,
  ads_generated INTEGER NOT NULL DEFAULT 0,
  execution_type TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'manual'
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'partial', 'failed'
  error_message TEXT,
  execution_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_generation_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their company's generation history"
ON public.ad_generation_history
FOR SELECT
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

CREATE POLICY "Service role can insert generation history"
ON public.ad_generation_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_generation_history_client ON public.ad_generation_history(client_id, executed_at DESC);
CREATE INDEX idx_generation_history_company ON public.ad_generation_history(company_id, executed_at DESC);