
-- Add telegram_bot_token and telegram_bot_name to ia_agents
ALTER TABLE public.ia_agents ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
ALTER TABLE public.ia_agents ADD COLUMN IF NOT EXISTS telegram_bot_name TEXT;

-- Create table for Telegram conversation history
CREATE TABLE public.ia_agent_telegram_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ia_agents(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, telegram_chat_id)
);

-- Enable RLS
ALTER TABLE public.ia_agent_telegram_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies - only company members can view
CREATE POLICY "Company members can view telegram conversations"
ON public.ia_agent_telegram_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ia_agents a
    JOIN public.company_members cm ON cm.company_id = a.company_id
    WHERE a.id = agent_id AND cm.user_id = auth.uid()
  )
);

-- Allow service role / edge functions to insert/update (no auth context in webhooks)
CREATE POLICY "Service role can manage telegram conversations"
ON public.ia_agent_telegram_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for fast lookup by agent + chat_id
CREATE INDEX idx_telegram_conv_agent_chat ON public.ia_agent_telegram_conversations(agent_id, telegram_chat_id);
