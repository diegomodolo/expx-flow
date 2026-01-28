-- Create table to store realtime analysis per conversation
CREATE TABLE public.whatsapp_realtime_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  temperature TEXT NOT NULL DEFAULT 'neutral',
  sentiment_score NUMERIC(3,2) DEFAULT 0,
  score NUMERIC(3,1) DEFAULT 5.0,
  alerts TEXT[] DEFAULT '{}',
  interpretation TEXT,
  suggestion TEXT,
  insight TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_realtime_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies with explicit table references
CREATE POLICY "Users can view analysis for their company conversations"
ON public.whatsapp_realtime_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_instances wi ON wc.instance_id = wi.id
    WHERE wc.id = whatsapp_realtime_analysis.conversation_id
    AND wi.company_id = whatsapp_realtime_analysis.company_id
  )
);

CREATE POLICY "Users can insert analysis for their company conversations"
ON public.whatsapp_realtime_analysis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_instances wi ON wc.instance_id = wi.id
    WHERE wc.id = whatsapp_realtime_analysis.conversation_id
    AND wi.company_id = whatsapp_realtime_analysis.company_id
  )
);

CREATE POLICY "Users can update analysis for their company conversations"
ON public.whatsapp_realtime_analysis
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_instances wi ON wc.instance_id = wi.id
    WHERE wc.id = whatsapp_realtime_analysis.conversation_id
    AND wi.company_id = whatsapp_realtime_analysis.company_id
  )
);

-- Create index for fast lookup
CREATE INDEX idx_whatsapp_realtime_analysis_conversation ON public.whatsapp_realtime_analysis(conversation_id);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_realtime_analysis_updated_at
BEFORE UPDATE ON public.whatsapp_realtime_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();