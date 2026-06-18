
-- Add telegram_bot_token and telegram_bot_name to ia_agents
ALTER TABLE public.ia_agents ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;

ALTER TABLE public.ia_agents ADD COLUMN IF NOT EXISTS telegram_bot_name TEXT;
-- Create table for Telegram conversation history
CREATE TABLE IF NOT EXISTS public.ia_agent_telegram_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ia_agents(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, telegram_chat_id)
);;



-- Enable RLS
ALTER TABLE public.ia_agent_telegram_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage telegram conversations"
ON public.ia_agent_telegram_conversations
FOR ALL
USING (true)
WITH CHECK (true);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

-- Index for fast lookup by agent + chat_id
CREATE INDEX IF NOT EXISTS idx_telegram_conv_agent_chat ON public.ia_agent_telegram_conversations(agent_id, telegram_chat_id);;
