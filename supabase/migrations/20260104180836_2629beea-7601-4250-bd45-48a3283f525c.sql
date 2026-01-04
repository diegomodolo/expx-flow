-- Create table for content plan chat messages
CREATE TABLE public.content_plan_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_plan_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view chat messages from their company"
ON public.content_plan_chat_messages
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert chat messages for their company"
ON public.content_plan_chat_messages
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete chat messages from their company"
ON public.content_plan_chat_messages
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_content_plan_chat_messages_plan_id ON public.content_plan_chat_messages(content_plan_id);
CREATE INDEX idx_content_plan_chat_messages_created_at ON public.content_plan_chat_messages(created_at);