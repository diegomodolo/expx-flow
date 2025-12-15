
-- 1. Create whatsapp_client_notification_settings table
CREATE TABLE public.whatsapp_client_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  gestor_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, client_id)
);

-- 2. Create whatsapp_client_trigger_subscriptions table
CREATE TABLE public.whatsapp_client_trigger_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_settings_id UUID NOT NULL REFERENCES public.whatsapp_client_notification_settings(id) ON DELETE CASCADE,
  trigger_id UUID NOT NULL REFERENCES public.whatsapp_notification_triggers(id) ON DELETE CASCADE,
  destination TEXT NOT NULL DEFAULT 'ambos' CHECK (destination IN ('gestor', 'cliente', 'ambos')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_settings_id, trigger_id)
);

-- 3. Modify whatsapp_client_contacts table
ALTER TABLE public.whatsapp_client_contacts 
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.whatsapp_client_contacts 
  DROP COLUMN IF EXISTS profile_type,
  DROP COLUMN IF EXISTS receives_alerts,
  DROP COLUMN IF EXISTS receives_reports;

-- 4. Enable RLS on new tables
ALTER TABLE public.whatsapp_client_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_client_trigger_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for whatsapp_client_notification_settings
CREATE POLICY "Company members can view client notification settings"
  ON public.whatsapp_client_notification_settings
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can create client notification settings"
  ON public.whatsapp_client_notification_settings
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can update client notification settings"
  ON public.whatsapp_client_notification_settings
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can delete client notification settings"
  ON public.whatsapp_client_notification_settings
  FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- 6. RLS policies for whatsapp_client_trigger_subscriptions
CREATE POLICY "Company members can view trigger subscriptions"
  ON public.whatsapp_client_trigger_subscriptions
  FOR SELECT
  USING (client_settings_id IN (
    SELECT id FROM public.whatsapp_client_notification_settings
    WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Company members can create trigger subscriptions"
  ON public.whatsapp_client_trigger_subscriptions
  FOR INSERT
  WITH CHECK (client_settings_id IN (
    SELECT id FROM public.whatsapp_client_notification_settings
    WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Company members can update trigger subscriptions"
  ON public.whatsapp_client_trigger_subscriptions
  FOR UPDATE
  USING (client_settings_id IN (
    SELECT id FROM public.whatsapp_client_notification_settings
    WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Company members can delete trigger subscriptions"
  ON public.whatsapp_client_trigger_subscriptions
  FOR DELETE
  USING (client_settings_id IN (
    SELECT id FROM public.whatsapp_client_notification_settings
    WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

-- 7. Create trigger for updated_at on new tables
CREATE TRIGGER update_whatsapp_client_notification_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_client_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_client_trigger_subscriptions_updated_at
  BEFORE UPDATE ON public.whatsapp_client_trigger_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
