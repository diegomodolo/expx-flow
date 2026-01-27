-- =============================================
-- FASE 1: Arquitetura Multi-Instância UazapiGO
-- =============================================

-- 1.1 Criar tabela whatsapp_instances
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  instance_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT false,
  connected_phone TEXT,
  last_connection_test TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, session_id)
);

-- Índices para whatsapp_instances
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company ON public.whatsapp_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_active ON public.whatsapp_instances(company_id, is_active) WHERE is_active = true;

-- RLS para whatsapp_instances
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view instances of their companies"
  ON public.whatsapp_instances FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert instances"
  ON public.whatsapp_instances FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update instances"
  ON public.whatsapp_instances FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete instances"
  ON public.whatsapp_instances FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Trigger para updated_at em whatsapp_instances
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for whatsapp_instances
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;

-- 1.2 Criar tabela whatsapp_instance_users
CREATE TABLE IF NOT EXISTS public.whatsapp_instance_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_send BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, user_id)
);

-- Índices para whatsapp_instance_users
CREATE INDEX IF NOT EXISTS idx_whatsapp_instance_users_instance ON public.whatsapp_instance_users(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instance_users_user ON public.whatsapp_instance_users(user_id);

-- RLS para whatsapp_instance_users
ALTER TABLE public.whatsapp_instance_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assignments"
  ON public.whatsapp_instance_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all assignments in their instances"
  ON public.whatsapp_instance_users FOR SELECT
  USING (instance_id IN (
    SELECT wi.id FROM public.whatsapp_instances wi
    JOIN public.company_members cm ON cm.company_id = wi.company_id
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can insert user assignments"
  ON public.whatsapp_instance_users FOR INSERT
  WITH CHECK (instance_id IN (
    SELECT wi.id FROM public.whatsapp_instances wi
    JOIN public.company_members cm ON cm.company_id = wi.company_id
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update user assignments"
  ON public.whatsapp_instance_users FOR UPDATE
  USING (instance_id IN (
    SELECT wi.id FROM public.whatsapp_instances wi
    JOIN public.company_members cm ON cm.company_id = wi.company_id
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete user assignments"
  ON public.whatsapp_instance_users FOR DELETE
  USING (instance_id IN (
    SELECT wi.id FROM public.whatsapp_instances wi
    JOIN public.company_members cm ON cm.company_id = wi.company_id
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  ));

-- 1.3 Adicionar instance_id nas tabelas existentes
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

ALTER TABLE public.whatsapp_notification_triggers 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_instance ON public.whatsapp_conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_triggers_instance ON public.whatsapp_notification_triggers(instance_id);