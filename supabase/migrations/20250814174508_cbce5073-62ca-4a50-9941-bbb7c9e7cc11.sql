-- Create AI Chat Conversations table
CREATE TABLE public.ai_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI Chat Messages table
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY "Company members can view conversations" 
ON public.ai_chat_conversations 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create conversations" 
ON public.ai_chat_conversations 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())) AND user_id = auth.uid());

CREATE POLICY "Users can update their own conversations" 
ON public.ai_chat_conversations 
FOR UPDATE 
USING (user_id = auth.uid() AND company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Users can delete their own conversations" 
ON public.ai_chat_conversations 
FOR DELETE 
USING (user_id = auth.uid() AND company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Create policies for messages
CREATE POLICY "Users can view messages from their conversations" 
ON public.ai_chat_messages 
FOR SELECT 
USING (conversation_id IN ( SELECT ai_chat_conversations.id
   FROM ai_chat_conversations
  WHERE (ai_chat_conversations.company_id IN ( SELECT company_members.company_id
     FROM company_members
    WHERE (company_members.user_id = auth.uid())))));

CREATE POLICY "Users can create messages in their conversations" 
ON public.ai_chat_messages 
FOR INSERT 
WITH CHECK (conversation_id IN ( SELECT ai_chat_conversations.id
   FROM ai_chat_conversations
  WHERE (ai_chat_conversations.user_id = auth.uid())));

-- Create trigger for updated_at
CREATE TRIGGER update_ai_chat_conversations_updated_at
BEFORE UPDATE ON public.ai_chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_ai_chat_conversations_client_id ON public.ai_chat_conversations(client_id);
CREATE INDEX idx_ai_chat_conversations_company_id ON public.ai_chat_conversations(company_id);
CREATE INDEX idx_ai_chat_conversations_user_id ON public.ai_chat_conversations(user_id);
CREATE INDEX idx_ai_chat_messages_conversation_id ON public.ai_chat_messages(conversation_id);
CREATE INDEX idx_ai_chat_messages_created_at ON public.ai_chat_messages(created_at);