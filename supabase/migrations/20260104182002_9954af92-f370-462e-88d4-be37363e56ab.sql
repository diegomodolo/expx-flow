-- Create carousel_generation_schedules table
CREATE TABLE public.carousel_generation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  generation_time TIME NOT NULL DEFAULT '09:00:00',
  carousels_per_day INTEGER NOT NULL DEFAULT 3,
  slides_per_carousel INTEGER NOT NULL DEFAULT 8,
  
  -- Distribution by carousel type (must sum to 100)
  tutorial_percentage INTEGER NOT NULL DEFAULT 25,
  comparison_percentage INTEGER NOT NULL DEFAULT 25,
  behind_scenes_percentage INTEGER NOT NULL DEFAULT 25,
  curated_list_percentage INTEGER NOT NULL DEFAULT 25,
  
  -- Visual style settings
  use_dark_mode BOOLEAN NOT NULL DEFAULT true,
  show_ui_screenshots BOOLEAN NOT NULL DEFAULT true,
  include_proof_social BOOLEAN NOT NULL DEFAULT true,
  include_save_bait BOOLEAN NOT NULL DEFAULT true,
  custom_image_prompt TEXT,
  
  -- Reference images
  reference_image_1 TEXT,
  reference_image_2 TEXT,
  reference_image_3 TEXT,
  reference_image_4 TEXT,
  reference_image_5 TEXT,
  reference_image_6 TEXT,
  
  -- Tracking
  last_generation_at TIMESTAMPTZ,
  next_generation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_carousel_schedule_per_client UNIQUE (client_id)
);

-- Create carousel_generation_queue table
CREATE TABLE public.carousel_generation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  schedule_id UUID REFERENCES public.carousel_generation_schedules(id) ON DELETE SET NULL,
  
  -- Carousel type
  carousel_type TEXT NOT NULL CHECK (carousel_type IN ('tutorial', 'comparison', 'behind_scenes', 'curated_list')),
  
  -- Content
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_image_url TEXT,
  caption TEXT,
  hashtags TEXT,
  cta_text TEXT,
  theme TEXT,
  
  -- Research connection
  research_theme_id UUID,
  
  -- Quality and status
  quality_score NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'editing')),
  
  -- Full generated content
  generated_content JSONB,
  
  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carousel_generation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for carousel_generation_schedules (using company_members like ad_generation_schedules)
CREATE POLICY "Users can view their company carousel schedules"
  ON public.carousel_generation_schedules
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert carousel schedules for their company"
  ON public.carousel_generation_schedules
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company carousel schedules"
  ON public.carousel_generation_schedules
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company carousel schedules"
  ON public.carousel_generation_schedules
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for carousel_generation_queue
CREATE POLICY "Users can view their company carousels"
  ON public.carousel_generation_queue
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert carousels for their company"
  ON public.carousel_generation_queue
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company carousels"
  ON public.carousel_generation_queue
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company carousels"
  ON public.carousel_generation_queue
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_carousel_schedules_client ON public.carousel_generation_schedules(client_id);
CREATE INDEX idx_carousel_schedules_company ON public.carousel_generation_schedules(company_id);
CREATE INDEX idx_carousel_schedules_active ON public.carousel_generation_schedules(is_active);

CREATE INDEX idx_carousel_queue_client ON public.carousel_generation_queue(client_id);
CREATE INDEX idx_carousel_queue_company ON public.carousel_generation_queue(company_id);
CREATE INDEX idx_carousel_queue_status ON public.carousel_generation_queue(status);
CREATE INDEX idx_carousel_queue_type ON public.carousel_generation_queue(carousel_type);
CREATE INDEX idx_carousel_queue_generated_at ON public.carousel_generation_queue(generated_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_carousel_schedules_updated_at
  BEFORE UPDATE ON public.carousel_generation_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_carousel_queue_updated_at
  BEFORE UPDATE ON public.carousel_generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();