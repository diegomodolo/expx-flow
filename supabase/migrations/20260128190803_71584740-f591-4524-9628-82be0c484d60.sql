-- Create table to store HISTORY of all realtime analyses (for analytics and dashboards)
CREATE TABLE public.whatsapp_realtime_analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  
  -- Analysis data
  temperature TEXT NOT NULL,
  score NUMERIC(3,1) DEFAULT 5.0,
  alerts TEXT[] DEFAULT '{}',
  interpretation TEXT,
  suggestion TEXT,
  insight JSONB, -- Store as JSONB for better querying
  ready_message TEXT,
  
  -- Context
  message_count INTEGER DEFAULT 0, -- How many messages were in the conversation at this point
  last_message_direction TEXT, -- 'inbound' or 'outbound'
  
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Indexes for analytics queries
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_realtime_analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view analysis history for their company"
ON public.whatsapp_realtime_analysis_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_instances wi ON wc.instance_id = wi.id
    WHERE wc.id = whatsapp_realtime_analysis_history.conversation_id
    AND wi.company_id = whatsapp_realtime_analysis_history.company_id
  )
);

CREATE POLICY "Users can insert analysis history for their company"
ON public.whatsapp_realtime_analysis_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_instances wi ON wc.instance_id = wi.id
    WHERE wc.id = whatsapp_realtime_analysis_history.conversation_id
    AND wi.company_id = whatsapp_realtime_analysis_history.company_id
  )
);

-- Create indexes for analytics queries
CREATE INDEX idx_analysis_history_conversation ON public.whatsapp_realtime_analysis_history(conversation_id);
CREATE INDEX idx_analysis_history_company ON public.whatsapp_realtime_analysis_history(company_id);
CREATE INDEX idx_analysis_history_analyzed_at ON public.whatsapp_realtime_analysis_history(analyzed_at DESC);
CREATE INDEX idx_analysis_history_temperature ON public.whatsapp_realtime_analysis_history(company_id, temperature);
CREATE INDEX idx_analysis_history_score ON public.whatsapp_realtime_analysis_history(company_id, score);