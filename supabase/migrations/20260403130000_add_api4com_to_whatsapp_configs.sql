-- Adicionar credenciais API4Com na tabela whatsapp_configs existente
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS api4com_token TEXT,
  ADD COLUMN IF NOT EXISTS api4com_extension TEXT;

COMMENT ON COLUMN public.whatsapp_configs.api4com_token IS 'Token de autenticação da API4Com (POST /users/login → id)';
COMMENT ON COLUMN public.whatsapp_configs.api4com_extension IS 'Ramal do agente para chamadas saintes (ex: 1000)';

-- Tabela de histórico de chamadas
CREATE TABLE IF NOT EXISTS public.voice_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  contact_name TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'initiated',
  api4com_call_id TEXT,
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  hangup_cause TEXT,
  record_url TEXT,
  metadata JSONB DEFAULT '{}',
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_calls_company ON public.voice_calls(company_id);
CREATE INDEX idx_voice_calls_conversation ON public.voice_calls(conversation_id);
CREATE INDEX idx_voice_calls_created ON public.voice_calls(created_at DESC);

ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_calls TO authenticated;

CREATE POLICY "Company members can view voice calls"
ON public.voice_calls FOR SELECT
TO authenticated
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can insert voice calls"
ON public.voice_calls FOR INSERT
TO authenticated
WITH CHECK (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can update voice calls"
ON public.voice_calls FOR UPDATE
TO authenticated
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
))
WITH CHECK (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Service role can manage voice calls"
ON public.voice_calls FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
