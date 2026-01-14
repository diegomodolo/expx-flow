-- Create table for client metric benchmarks (ideal metrics per platform)
CREATE TABLE public.client_metric_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta_ads', 'google_ads')),
  target_cpa NUMERIC,
  target_cpl NUMERIC,
  target_ctr NUMERIC,
  target_cpc NUMERIC,
  target_cpm NUMERIC,
  target_roas NUMERIC,
  target_conversion_rate NUMERIC,
  target_frequency NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, platform)
);

-- Enable RLS
ALTER TABLE public.client_metric_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for company-based access
CREATE POLICY "Users can view benchmarks of their company clients"
ON public.client_metric_benchmarks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = client_metric_benchmarks.company_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert benchmarks for their company clients"
ON public.client_metric_benchmarks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = client_metric_benchmarks.company_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update benchmarks of their company clients"
ON public.client_metric_benchmarks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = client_metric_benchmarks.company_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete benchmarks of their company clients"
ON public.client_metric_benchmarks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = client_metric_benchmarks.company_id
    AND cm.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_client_metric_benchmarks_updated_at
BEFORE UPDATE ON public.client_metric_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();