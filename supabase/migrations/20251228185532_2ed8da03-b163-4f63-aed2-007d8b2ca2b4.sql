-- Create table for flexible schedule slots
-- Each slot has its own day, hour, and post type configuration
CREATE TABLE public.instagram_auto_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.instagram_auto_post_configs(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  post_type TEXT NOT NULL DEFAULT 'single' CHECK (post_type IN ('single', 'carousel')),
  carousel_images INTEGER DEFAULT 5 CHECK (carousel_images >= 5 AND carousel_images <= 10),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(config_id, day_of_week, hour)
);

-- Enable RLS
ALTER TABLE public.instagram_auto_post_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule slots (using created_by from configs table)
CREATE POLICY "Users can view schedule slots of their configs" 
ON public.instagram_auto_post_schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    WHERE c.id = config_id 
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert schedule slots for their configs" 
ON public.instagram_auto_post_schedules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    WHERE c.id = config_id 
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update schedule slots of their configs" 
ON public.instagram_auto_post_schedules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    WHERE c.id = config_id 
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete schedule slots of their configs" 
ON public.instagram_auto_post_schedules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    WHERE c.id = config_id 
    AND c.created_by = auth.uid()
  )
);

-- Migrate existing scheduled_days and scheduled_hours to new slots table
-- For existing configs, create slots with their current post_type
INSERT INTO public.instagram_auto_post_schedules (config_id, day_of_week, hour, post_type, carousel_images)
SELECT 
  c.id,
  d.day,
  h.hour,
  COALESCE(c.post_type, 'single'),
  COALESCE(c.carousel_min_images, 5)
FROM public.instagram_auto_post_configs c
CROSS JOIN LATERAL unnest(c.scheduled_days) AS d(day)
CROSS JOIN LATERAL unnest(c.scheduled_hours) AS h(hour)
WHERE c.scheduled_days IS NOT NULL 
  AND c.scheduled_hours IS NOT NULL
  AND array_length(c.scheduled_days, 1) > 0
  AND array_length(c.scheduled_hours, 1) > 0
ON CONFLICT (config_id, day_of_week, hour) DO NOTHING;