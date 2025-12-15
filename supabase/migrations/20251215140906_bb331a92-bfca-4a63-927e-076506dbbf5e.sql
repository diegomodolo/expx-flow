-- Tabela de gatilhos de notificação
CREATE TABLE public.whatsapp_notification_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('high_cpa', 'low_balance', 'disabled_account', 'presentation_summary', 'post_published', 'post_failed', 'weekly_report', 'monthly_report', 'custom')),
  trigger_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de templates de mensagem por perfil
CREATE TABLE public.whatsapp_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_id UUID NOT NULL REFERENCES public.whatsapp_notification_triggers(id) ON DELETE CASCADE,
  recipient_profile TEXT NOT NULL CHECK (recipient_profile IN ('gestor', 'cliente')),
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trigger_id, recipient_profile)
);

-- Tabela de agendamento de gatilhos
CREATE TABLE public.whatsapp_trigger_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_id UUID NOT NULL REFERENCES public.whatsapp_notification_triggers(id) ON DELETE CASCADE UNIQUE,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly')) DEFAULT 'daily',
  times_per_day INTEGER DEFAULT 1 CHECK (times_per_day >= 1 AND times_per_day <= 24),
  execution_hours INTEGER[] DEFAULT ARRAY[9],
  days_of_week INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5],
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  preferred_time TIME DEFAULT '09:00:00',
  respect_quiet_hours BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de contatos por cliente
CREATE TABLE public.whatsapp_client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('gestor', 'cliente', 'financeiro')) DEFAULT 'gestor',
  receives_alerts BOOLEAN NOT NULL DEFAULT true,
  receives_reports BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de log de execuções
CREATE TABLE public.whatsapp_execution_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.whatsapp_notification_triggers(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES public.whatsapp_trigger_schedules(id) ON DELETE SET NULL,
  execution_window TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  messages_sent INTEGER NOT NULL DEFAULT 0,
  messages_failed INTEGER NOT NULL DEFAULT 0,
  execution_details JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_notification_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_trigger_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_execution_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_notification_triggers
CREATE POLICY "Company members can view triggers" ON public.whatsapp_notification_triggers
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company admins can manage triggers" ON public.whatsapp_notification_triggers
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- RLS Policies for whatsapp_message_templates
CREATE POLICY "Company members can view templates" ON public.whatsapp_message_templates
  FOR SELECT USING (trigger_id IN (SELECT id FROM whatsapp_notification_triggers WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())));

CREATE POLICY "Company admins can manage templates" ON public.whatsapp_message_templates
  FOR ALL USING (trigger_id IN (SELECT id FROM whatsapp_notification_triggers WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))));

-- RLS Policies for whatsapp_trigger_schedules
CREATE POLICY "Company members can view schedules" ON public.whatsapp_trigger_schedules
  FOR SELECT USING (trigger_id IN (SELECT id FROM whatsapp_notification_triggers WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())));

CREATE POLICY "Company admins can manage schedules" ON public.whatsapp_trigger_schedules
  FOR ALL USING (trigger_id IN (SELECT id FROM whatsapp_notification_triggers WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))));

-- RLS Policies for whatsapp_client_contacts
CREATE POLICY "Company members can view contacts" ON public.whatsapp_client_contacts
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company admins can manage contacts" ON public.whatsapp_client_contacts
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- RLS Policies for whatsapp_execution_log
CREATE POLICY "Company members can view execution logs" ON public.whatsapp_execution_log
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "System can manage execution logs" ON public.whatsapp_execution_log
  FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_whatsapp_triggers_company ON public.whatsapp_notification_triggers(company_id);
CREATE INDEX idx_whatsapp_triggers_type ON public.whatsapp_notification_triggers(trigger_type);
CREATE INDEX idx_whatsapp_templates_trigger ON public.whatsapp_message_templates(trigger_id);
CREATE INDEX idx_whatsapp_schedules_next ON public.whatsapp_trigger_schedules(next_execution_at);
CREATE INDEX idx_whatsapp_contacts_client ON public.whatsapp_client_contacts(client_id);
CREATE INDEX idx_whatsapp_contacts_company ON public.whatsapp_client_contacts(company_id);
CREATE INDEX idx_whatsapp_logs_company ON public.whatsapp_execution_log(company_id);
CREATE INDEX idx_whatsapp_logs_trigger ON public.whatsapp_execution_log(trigger_id);
CREATE INDEX idx_whatsapp_logs_status ON public.whatsapp_execution_log(status);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_triggers_updated_at
  BEFORE UPDATE ON public.whatsapp_notification_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_schedules_updated_at
  BEFORE UPDATE ON public.whatsapp_trigger_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_contacts_updated_at
  BEFORE UPDATE ON public.whatsapp_client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();