-- Create table for AI chat messages per WhatsApp conversation
CREATE TABLE public.whatsapp_ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  source_message_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies - using same pattern as whatsapp_conversations
CREATE POLICY "Users can view AI chat messages from conversations they have access to"
ON public.whatsapp_ai_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = whatsapp_ai_chat_messages.conversation_id
    AND wc.company_id = whatsapp_ai_chat_messages.company_id
  )
);

CREATE POLICY "Users can create AI chat messages"
ON public.whatsapp_ai_chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = whatsapp_ai_chat_messages.conversation_id
    AND wc.company_id = whatsapp_ai_chat_messages.company_id
  )
);

CREATE POLICY "Users can delete their own AI chat messages"
ON public.whatsapp_ai_chat_messages
FOR DELETE
USING (user_id = auth.uid());

-- Create indexes for faster queries
CREATE INDEX idx_whatsapp_ai_chat_messages_conversation ON public.whatsapp_ai_chat_messages(conversation_id);
CREATE INDEX idx_whatsapp_ai_chat_messages_company ON public.whatsapp_ai_chat_messages(company_id);