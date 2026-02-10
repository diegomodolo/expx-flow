
-- Create campaign send log to track sent templates and prevent repetition
CREATE TABLE public.groupops_campaign_send_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  campaign_id uuid NOT NULL,
  template_id uuid NOT NULL,
  group_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  cycle_number int NOT NULL DEFAULT 1,
  message_preview text,
  delivery_status text DEFAULT 'sent',
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.groupops_campaign_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage send logs for their company"
  ON public.groupops_campaign_send_log FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE INDEX idx_campaign_send_log_campaign ON public.groupops_campaign_send_log(campaign_id, cycle_number);
CREATE INDEX idx_campaign_send_log_sent_at ON public.groupops_campaign_send_log(sent_at DESC);
