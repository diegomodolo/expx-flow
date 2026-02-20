
-- Create instagram_conversations table
CREATE TABLE public.instagram_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  ig_user_id TEXT NOT NULL,
  ig_username TEXT,
  ig_profile_pic_url TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, instagram_account_id, ig_user_id)
);

ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view instagram conversations"
  ON public.instagram_conversations FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can insert instagram conversations"
  ON public.instagram_conversations FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update instagram conversations"
  ON public.instagram_conversations FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Create instagram_messages table
CREATE TABLE public.instagram_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.instagram_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  external_id TEXT,
  status TEXT DEFAULT 'delivered',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view instagram messages"
  ON public.instagram_messages FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can insert instagram messages"
  ON public.instagram_messages FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Create instagram_automation_flows table
CREATE TABLE public.instagram_automation_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  flow_name TEXT NOT NULL,
  flow_data JSONB NOT NULL DEFAULT '{"steps": []}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_automation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage instagram automation flows"
  ON public.instagram_automation_flows FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Create instagram_keyword_triggers table
CREATE TABLE public.instagram_keyword_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  trigger_name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  match_mode TEXT NOT NULL DEFAULT 'any' CHECK (match_mode IN ('any', 'all', 'exact')),
  flow_id UUID NOT NULL REFERENCES public.instagram_automation_flows(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_keyword_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage instagram keyword triggers"
  ON public.instagram_keyword_triggers FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Create instagram_automation_logs table
CREATE TABLE public.instagram_automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.instagram_keyword_triggers(id) ON DELETE SET NULL,
  flow_id UUID REFERENCES public.instagram_automation_flows(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.instagram_conversations(id) ON DELETE SET NULL,
  ig_user_id TEXT NOT NULL,
  matched_keyword TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
  steps_executed INTEGER DEFAULT 0,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view instagram automation logs"
  ON public.instagram_automation_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Trigger for updated_at on instagram_conversations
CREATE OR REPLACE FUNCTION public.update_instagram_conversations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_instagram_conversations_updated_at
  BEFORE UPDATE ON public.instagram_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_instagram_conversations_updated_at();

-- Trigger for updated_at on instagram_automation_flows  
CREATE OR REPLACE FUNCTION public.update_instagram_automation_flows_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_instagram_automation_flows_updated_at
  BEFORE UPDATE ON public.instagram_automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_instagram_automation_flows_updated_at();

-- Trigger for updated_at on instagram_keyword_triggers
CREATE OR REPLACE FUNCTION public.update_instagram_keyword_triggers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_instagram_keyword_triggers_updated_at
  BEFORE UPDATE ON public.instagram_keyword_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_instagram_keyword_triggers_updated_at();
