-- Create table for WhatsApp conversation-specific notes
-- These are notes about the specific chat/contact, not the client

CREATE TABLE public.whatsapp_conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversation_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view conversation notes from their company"
ON public.whatsapp_conversation_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = whatsapp_conversation_notes.company_id
  )
);

CREATE POLICY "Users can create conversation notes for their company"
ON public.whatsapp_conversation_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = whatsapp_conversation_notes.company_id
  )
);

CREATE POLICY "Users can delete their own conversation notes"
ON public.whatsapp_conversation_notes
FOR DELETE
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_whatsapp_conversation_notes_conversation_id ON public.whatsapp_conversation_notes(conversation_id);
CREATE INDEX idx_whatsapp_conversation_notes_company_id ON public.whatsapp_conversation_notes(company_id);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_conversation_notes_updated_at
BEFORE UPDATE ON public.whatsapp_conversation_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();