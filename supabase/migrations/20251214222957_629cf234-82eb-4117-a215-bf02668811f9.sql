-- Add new columns to presentation_meetings for meeting report
ALTER TABLE public.presentation_meetings 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS approved_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rejected_count INTEGER DEFAULT 0;

-- Add resubmitted tracking to approvals
ALTER TABLE public.presentation_creative_approvals
ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMPTZ;

-- Add status tracking and scheduling link to creatives
ALTER TABLE public.presentation_creatives
ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'pending' CHECK (current_status IN ('pending', 'approved', 'rejected', 'resubmitted', 'scheduled')),
ADD COLUMN IF NOT EXISTS scheduled_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_approved_by UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_presentation_creatives_scheduled_post 
ON public.presentation_creatives(scheduled_post_id) 
WHERE scheduled_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presentation_creatives_current_status 
ON public.presentation_creatives(current_status);

-- Add RLS policies for the new columns (they inherit existing table policies)
-- Update existing creatives to have 'pending' status
UPDATE public.presentation_creatives 
SET current_status = 'pending' 
WHERE current_status IS NULL;