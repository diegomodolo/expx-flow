-- Tabela de configuração Z-API por empresa
CREATE TABLE public.whatsapp_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instance_id TEXT,
  token TEXT,
  client_token TEXT,
  is_active BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT false,
  connected_phone TEXT,
  last_connection_test TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Tabela de preferências de notificação
CREATE TABLE public.whatsapp_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notify_high_cpa BOOLEAN DEFAULT true,
  notify_low_balance BOOLEAN DEFAULT true,
  notify_disabled_account BOOLEAN DEFAULT true,
  notify_presentation_summary BOOLEAN DEFAULT true,
  notify_post_published BOOLEAN DEFAULT false,
  notify_post_failed BOOLEAN DEFAULT true,
  cpa_threshold_percentage INTEGER DEFAULT 50,
  balance_threshold_days INTEGER DEFAULT 2,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Tabela de destinatários
CREATE TABLE public.whatsapp_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT,
  receive_alerts BOOLEAN DEFAULT true,
  receive_reports BOOLEAN DEFAULT true,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de log de notificações
CREATE TABLE public.whatsapp_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  zapi_message_id TEXT,
  error_message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notification_log ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_configs
CREATE POLICY "Company admins can manage whatsapp configs"
ON public.whatsapp_configs
FOR ALL
USING (company_id IN (
  SELECT company_members.company_id FROM company_members
  WHERE company_members.user_id = auth.uid()
  AND company_members.role IN ('owner', 'admin')
));

CREATE POLICY "Company members can view whatsapp configs"
ON public.whatsapp_configs
FOR SELECT
USING (company_id IN (
  SELECT company_members.company_id FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Policies para whatsapp_notification_preferences
CREATE POLICY "Company admins can manage notification preferences"
ON public.whatsapp_notification_preferences
FOR ALL
USING (company_id IN (
  SELECT company_members.company_id FROM company_members
  WHERE company_members.user_id = auth.uid()
  AND company_members.role IN ('owner', 'admin')
));

CREATE POLICY "Company members can view notification preferences"
ON public.whatsapp_notification_preferences
FOR SELECT
USING (company_id IN (
  SELECT company_members.company_id FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Policies para whatsapp_recipients
CREATE POLICY "Company admins can manage recipients"
ON public.whatsapp_recipients
FOR ALL
USING (company_id IN (
  SELECT company_members.company_id FROM company_members
  WHERE company_members.user_id = auth.uid()
  AND company_members.role IN ('owner', 'admin')
));

CREATE POLICY "Company members can view recipients"
ON public.whatsapp_recipients
FOR SELECT
USING (company_id IN (
  SELECT company_members.company_id FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Policies para whatsapp_notification_log
CREATE POLICY "Company members can view notification logs"
ON public.whatsapp_notification_log
FOR SELECT
USING (company_id IN (
  SELECT company_members.company_id FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "System can create notification logs"
ON public.whatsapp_notification_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update notification logs"
ON public.whatsapp_notification_log
FOR UPDATE
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_configs_updated_at
BEFORE UPDATE ON public.whatsapp_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_notification_preferences_updated_at
BEFORE UPDATE ON public.whatsapp_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_recipients_updated_at
BEFORE UPDATE ON public.whatsapp_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();