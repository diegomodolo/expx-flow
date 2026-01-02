-- Create enum for ad generation types
CREATE TYPE ad_generation_type AS ENUM ('clone', 'concept', 'iteration');

-- Create enum for ad generation status
CREATE TYPE ad_generation_status AS ENUM ('pending', 'approved', 'rejected', 'published');

-- Table for storing generated ads queue for review
CREATE TABLE public.ad_generation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  generation_type ad_generation_type NOT NULL,
  source_ad_id UUID NULL, -- Reference to competitor ad or own winning ad
  source_competitor_id UUID NULL REFERENCES public.competitors(id) ON DELETE SET NULL,
  generated_content JSONB NOT NULL, -- Full ad content (headline, copy, image_url, etc.)
  concept_description TEXT NULL, -- AI explanation of the concept
  research_sources JSONB NULL, -- Sources used for concept generation
  quality_score DECIMAL(3,2) NULL, -- AI-generated quality score 0-1
  status ad_generation_status NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ NULL, -- When this was scheduled to be generated
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL,
  published_at TIMESTAMPTZ NULL,
  meta_ad_id TEXT NULL, -- ID from Meta after publishing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for client ad generation schedules
CREATE TABLE public.ad_generation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generation_time TIME NOT NULL DEFAULT '06:00:00', -- When to generate daily
  ads_per_day INTEGER NOT NULL DEFAULT 100,
  clone_percentage INTEGER NOT NULL DEFAULT 20, -- % of ads that are clones
  concept_percentage INTEGER NOT NULL DEFAULT 50, -- % of ads that are new concepts
  iteration_percentage INTEGER NOT NULL DEFAULT 30, -- % of ads that are iterations
  autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  autopilot_min_quality_score DECIMAL(3,2) NULL DEFAULT 0.7,
  autopilot_max_daily_budget DECIMAL(10,2) NULL,
  last_generation_at TIMESTAMPTZ NULL,
  next_generation_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Table for tracking winning ads
CREATE TABLE public.ad_performance_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ad_id UUID NULL REFERENCES public.ads(id) ON DELETE SET NULL,
  facebook_ad_id TEXT NULL,
  ad_name TEXT NOT NULL,
  days_running INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NULL,
  clicks INTEGER NULL,
  conversions INTEGER NULL,
  spend DECIMAL(10,2) NULL,
  ctr DECIMAL(5,4) NULL,
  cpa DECIMAL(10,2) NULL,
  roas DECIMAL(6,2) NULL,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  winner_reason TEXT NULL, -- Why AI classified as winner
  last_analyzed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for market research insights
CREATE TABLE public.market_research_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'reddit', 'reviews', 'perplexity', 'competitor'
  source_url TEXT NULL,
  topic TEXT NOT NULL,
  pain_point TEXT NULL,
  opportunity TEXT NULL,
  sentiment TEXT NULL, -- 'positive', 'negative', 'neutral'
  relevance_score DECIMAL(3,2) NULL,
  raw_content TEXT NULL,
  extracted_quotes JSONB NULL,
  used_in_ads INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_generation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_performance_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_research_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_generation_queue
CREATE POLICY "Users can view their company's ad queue"
ON public.ad_generation_queue FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert ads to their company's queue"
ON public.ad_generation_queue FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their company's ad queue"
ON public.ad_generation_queue FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete from their company's ad queue"
ON public.ad_generation_queue FOR DELETE
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

-- RLS Policies for ad_generation_schedules
CREATE POLICY "Users can view their company's schedules"
ON public.ad_generation_schedules FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage their company's schedules"
ON public.ad_generation_schedules FOR ALL
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

-- RLS Policies for ad_performance_winners
CREATE POLICY "Users can view their company's winners"
ON public.ad_performance_winners FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage their company's winners"
ON public.ad_performance_winners FOR ALL
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

-- RLS Policies for market_research_insights
CREATE POLICY "Users can view their company's insights"
ON public.market_research_insights FOR SELECT
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage their company's insights"
ON public.market_research_insights FOR ALL
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX idx_ad_queue_client_status ON public.ad_generation_queue(client_id, status);
CREATE INDEX idx_ad_queue_scheduled ON public.ad_generation_queue(scheduled_for);
CREATE INDEX idx_ad_schedules_next ON public.ad_generation_schedules(next_generation_at) WHERE is_active = true;
CREATE INDEX idx_winners_client ON public.ad_performance_winners(client_id, is_winner);
CREATE INDEX idx_insights_client ON public.market_research_insights(client_id, source_type);

-- Triggers for updated_at
CREATE TRIGGER update_ad_queue_updated_at
BEFORE UPDATE ON public.ad_generation_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_schedules_updated_at
BEFORE UPDATE ON public.ad_generation_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_winners_updated_at
BEFORE UPDATE ON public.ad_performance_winners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_insights_updated_at
BEFORE UPDATE ON public.market_research_insights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();