-- Create table to store multiple publication destinations for ad generation schedules
CREATE TABLE public.ad_generation_schedule_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.ad_generation_schedules(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  adset_id UUID NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, campaign_id, adset_id)
);

-- Enable Row Level Security
ALTER TABLE public.ad_generation_schedule_destinations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view destinations for their company schedules" 
ON public.ad_generation_schedule_destinations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.ad_generation_schedules s
    JOIN public.company_members cm ON cm.company_id = s.company_id
    WHERE s.id = schedule_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert destinations for their company schedules" 
ON public.ad_generation_schedule_destinations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ad_generation_schedules s
    JOIN public.company_members cm ON cm.company_id = s.company_id
    WHERE s.id = schedule_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete destinations for their company schedules" 
ON public.ad_generation_schedule_destinations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.ad_generation_schedules s
    JOIN public.company_members cm ON cm.company_id = s.company_id
    WHERE s.id = schedule_id AND cm.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_schedule_destinations_schedule ON public.ad_generation_schedule_destinations(schedule_id);

-- Migrate existing data from single destination to new table
INSERT INTO public.ad_generation_schedule_destinations (schedule_id, campaign_id, adset_id)
SELECT id, target_campaign_id, target_adset_id
FROM public.ad_generation_schedules
WHERE target_campaign_id IS NOT NULL AND target_adset_id IS NOT NULL;