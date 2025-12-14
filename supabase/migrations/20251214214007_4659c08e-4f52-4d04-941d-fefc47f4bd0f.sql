-- Create table for presentation meetings
CREATE TABLE public.presentation_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.content_presentations(id) ON DELETE CASCADE,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'in_progress',
  summary_sent BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for meeting participants
CREATE TABLE public.presentation_meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.presentation_meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for creative approvals
CREATE TABLE public.presentation_creative_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.presentation_meetings(id) ON DELETE CASCADE,
  creative_id UUID NOT NULL REFERENCES public.presentation_creatives(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, creative_id)
);

-- Enable RLS
ALTER TABLE public.presentation_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_creative_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for presentation_meetings (public access via presentation token)
CREATE POLICY "Public can view meetings via presentation token"
ON public.presentation_meetings
FOR SELECT
USING (
  presentation_id IN (
    SELECT id FROM public.content_presentations 
    WHERE public_token IS NOT NULL AND status = 'published'
  )
);

CREATE POLICY "Public can create meetings for published presentations"
ON public.presentation_meetings
FOR INSERT
WITH CHECK (
  presentation_id IN (
    SELECT id FROM public.content_presentations 
    WHERE public_token IS NOT NULL AND status = 'published'
  )
);

CREATE POLICY "Public can update meetings in progress"
ON public.presentation_meetings
FOR UPDATE
USING (
  status = 'in_progress' AND
  presentation_id IN (
    SELECT id FROM public.content_presentations 
    WHERE public_token IS NOT NULL AND status = 'published'
  )
);

-- RLS Policies for presentation_meeting_participants
CREATE POLICY "Public can view participants via meeting"
ON public.presentation_meeting_participants
FOR SELECT
USING (
  meeting_id IN (
    SELECT pm.id FROM public.presentation_meetings pm
    JOIN public.content_presentations cp ON pm.presentation_id = cp.id
    WHERE cp.public_token IS NOT NULL AND cp.status = 'published'
  )
);

CREATE POLICY "Public can add participants to meetings"
ON public.presentation_meeting_participants
FOR INSERT
WITH CHECK (
  meeting_id IN (
    SELECT pm.id FROM public.presentation_meetings pm
    JOIN public.content_presentations cp ON pm.presentation_id = cp.id
    WHERE cp.public_token IS NOT NULL AND cp.status = 'published'
  )
);

CREATE POLICY "Public can delete participants from in-progress meetings"
ON public.presentation_meeting_participants
FOR DELETE
USING (
  meeting_id IN (
    SELECT pm.id FROM public.presentation_meetings pm
    JOIN public.content_presentations cp ON pm.presentation_id = cp.id
    WHERE cp.public_token IS NOT NULL AND cp.status = 'published' AND pm.status = 'in_progress'
  )
);

-- RLS Policies for presentation_creative_approvals
CREATE POLICY "Public can view approvals via meeting"
ON public.presentation_creative_approvals
FOR SELECT
USING (
  meeting_id IN (
    SELECT pm.id FROM public.presentation_meetings pm
    JOIN public.content_presentations cp ON pm.presentation_id = cp.id
    WHERE cp.public_token IS NOT NULL AND cp.status = 'published'
  )
);

CREATE POLICY "Public can create approvals for meetings"
ON public.presentation_creative_approvals
FOR INSERT
WITH CHECK (
  meeting_id IN (
    SELECT pm.id FROM public.presentation_meetings pm
    JOIN public.content_presentations cp ON pm.presentation_id = cp.id
    WHERE cp.public_token IS NOT NULL AND cp.status = 'published'
  )
);

CREATE POLICY "Public can update approvals for in-progress meetings"
ON public.presentation_creative_approvals
FOR UPDATE
USING (
  meeting_id IN (
    SELECT pm.id FROM public.presentation_meetings pm
    JOIN public.content_presentations cp ON pm.presentation_id = cp.id
    WHERE cp.public_token IS NOT NULL AND cp.status = 'published' AND pm.status = 'in_progress'
  )
);

-- Indexes for performance
CREATE INDEX idx_presentation_meetings_presentation_id ON public.presentation_meetings(presentation_id);
CREATE INDEX idx_presentation_meeting_participants_meeting_id ON public.presentation_meeting_participants(meeting_id);
CREATE INDEX idx_presentation_creative_approvals_meeting_id ON public.presentation_creative_approvals(meeting_id);
CREATE INDEX idx_presentation_creative_approvals_creative_id ON public.presentation_creative_approvals(creative_id);