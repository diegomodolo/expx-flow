-- ============================================
-- CREATIVE FACTORY TABLES
-- ============================================

-- Table: creative_generation_schedules
-- Stores the configuration for daily creative generation per client
CREATE TABLE public.creative_generation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generation_time TIME NOT NULL DEFAULT '08:00',
  creatives_per_day INTEGER NOT NULL DEFAULT 5,
  
  -- Distribution of types (concept = research, iteration = based on previous)
  concept_percentage INTEGER NOT NULL DEFAULT 70,
  iteration_percentage INTEGER NOT NULL DEFAULT 30,
  
  -- Image settings
  always_include_text_in_images BOOLEAN NOT NULL DEFAULT true,
  custom_image_prompt TEXT,
  reference_image_1 TEXT,
  reference_image_2 TEXT,
  reference_image_3 TEXT,
  reference_image_4 TEXT,
  reference_image_5 TEXT,
  reference_image_6 TEXT,
  
  -- Execution control
  last_generation_at TIMESTAMPTZ,
  next_generation_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(client_id)
);

-- Table: creative_generation_queue
-- Stores generated creatives for social media
CREATE TABLE public.creative_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Generated content
  generation_type TEXT NOT NULL CHECK (generation_type IN ('concept', 'iteration')),
  creative_type TEXT NOT NULL DEFAULT 'post_unico',
  image_url TEXT,
  video_url TEXT,
  caption TEXT,
  hashtags TEXT,
  theme TEXT,
  generated_content JSONB DEFAULT '{}'::jsonb,
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'scheduled')),
  quality_score NUMERIC(3,1),
  
  -- References
  source_creative_id UUID REFERENCES creative_generation_queue(id),
  research_theme_id UUID,
  
  -- Publication
  published_at TIMESTAMPTZ,
  scheduled_post_id UUID,
  presentation_id UUID,
  
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: creative_generation_history
-- Logs each generation execution
CREATE TABLE public.creative_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES creative_generation_schedules(id) ON DELETE SET NULL,
  
  creatives_requested INTEGER NOT NULL,
  creatives_generated INTEGER NOT NULL DEFAULT 0,
  execution_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (execution_type IN ('scheduled', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'partial', 'failed')),
  
  execution_details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.creative_generation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_generation_history ENABLE ROW LEVEL SECURITY;

-- Policies for creative_generation_schedules
CREATE POLICY "Users can view their company creative schedules"
  ON public.creative_generation_schedules FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert creative schedules for their company"
  ON public.creative_generation_schedules FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update their company creative schedules"
  ON public.creative_generation_schedules FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete their company creative schedules"
  ON public.creative_generation_schedules FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Policies for creative_generation_queue
CREATE POLICY "Users can view their company creative queue"
  ON public.creative_generation_queue FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert creatives for their company"
  ON public.creative_generation_queue FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update their company creatives"
  ON public.creative_generation_queue FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete their company creatives"
  ON public.creative_generation_queue FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Policies for creative_generation_history
CREATE POLICY "Users can view their company creative history"
  ON public.creative_generation_history FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert creative history for their company"
  ON public.creative_generation_history FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_creative_generation_schedules_updated_at
  BEFORE UPDATE ON public.creative_generation_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creative_generation_queue_updated_at
  BEFORE UPDATE ON public.creative_generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_creative_schedules_client ON public.creative_generation_schedules(client_id);
CREATE INDEX idx_creative_schedules_company ON public.creative_generation_schedules(company_id);
CREATE INDEX idx_creative_schedules_active ON public.creative_generation_schedules(is_active, next_generation_at);

CREATE INDEX idx_creative_queue_client ON public.creative_generation_queue(client_id);
CREATE INDEX idx_creative_queue_company ON public.creative_generation_queue(company_id);
CREATE INDEX idx_creative_queue_status ON public.creative_generation_queue(status);
CREATE INDEX idx_creative_queue_generated_at ON public.creative_generation_queue(generated_at DESC);

CREATE INDEX idx_creative_history_client ON public.creative_generation_history(client_id);
CREATE INDEX idx_creative_history_schedule ON public.creative_generation_history(schedule_id);
CREATE INDEX idx_creative_history_executed_at ON public.creative_generation_history(executed_at DESC);