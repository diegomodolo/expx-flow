-- Create system_alerts table for centralized alert management
CREATE TABLE public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL, -- 'post_failed', 'account_restricted', 'token_expired', 'low_balance', etc.
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  related_entity_type TEXT, -- 'instagram_auto_post', 'scheduled_post', 'campaign', etc.
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view alerts from their companies"
ON public.system_alerts
FOR SELECT
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update alerts from their companies"
ON public.system_alerts
FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

CREATE POLICY "Service role can insert alerts"
ON public.system_alerts
FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_system_alerts_company_id ON public.system_alerts(company_id);
CREATE INDEX idx_system_alerts_is_read ON public.system_alerts(is_read) WHERE is_read = false;
CREATE INDEX idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX idx_system_alerts_created_at ON public.system_alerts(created_at DESC);

-- Add new notification type to whatsapp-alerts helper
-- This is handled in the buildAlertMessage function