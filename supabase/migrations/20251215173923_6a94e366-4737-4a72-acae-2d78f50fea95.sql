-- =============================================
-- LEAD INTELLIGENCE HUB - Phase 1: Database Structure
-- =============================================

-- 1. Company API Keys (for public API authentication)
CREATE TABLE public.company_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"capture": true, "conversion": true, "read": false}'::jsonb,
  
  last_used_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 2. Lead Master Pool (central lead repository)
CREATE TABLE public.lead_master_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Unique identifiers for deduplication (SHA256 hashes)
  email_hash TEXT,
  phone_hash TEXT,
  
  -- Original data for display
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  
  -- Additional data for qualified audiences
  first_name TEXT,
  last_name TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BR',
  zip_code TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('m', 'f', 'o', NULL)),
  
  -- Social media
  facebook_id TEXT,
  instagram TEXT,
  
  -- Origin and tracking
  original_source TEXT DEFAULT 'api',
  first_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  first_captured_at TIMESTAMPTZ DEFAULT now(),
  
  -- Global metrics
  total_interactions INTEGER DEFAULT 1,
  total_conversions INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  
  -- Global scoring
  global_score INTEGER DEFAULT 0 CHECK (global_score >= 0 AND global_score <= 100),
  propensity_to_convert NUMERIC DEFAULT 0 CHECK (propensity_to_convert >= 0 AND propensity_to_convert <= 1),
  
  -- Metadata
  extra_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraints for deduplication (only when hash is not null)
CREATE UNIQUE INDEX idx_lead_pool_email_unique ON public.lead_master_pool(company_id, email_hash) WHERE email_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_lead_pool_phone_unique ON public.lead_master_pool(company_id, phone_hash) WHERE phone_hash IS NOT NULL;

-- 3. Lead Segments (manual and automatic segment definitions)
CREATE TABLE public.lead_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'tag',
  
  -- Segment type
  segment_type TEXT NOT NULL CHECK (segment_type IN ('sector', 'behavior', 'location', 'value', 'status', 'custom')),
  
  -- Automatic rules (JSON)
  auto_rules JSONB,
  is_auto BOOLEAN DEFAULT false,
  
  -- Metrics
  lead_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Lead Segment Assignments (N:N between leads and segments)
CREATE TABLE public.lead_segment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.lead_master_pool(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.lead_segments(id) ON DELETE CASCADE,
  
  assigned_by TEXT DEFAULT 'auto' CHECK (assigned_by IN ('auto', 'manual', 'api')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(lead_id, segment_id)
);

-- 5. Lead Client Interactions (cross-client intelligence)
CREATE TABLE public.lead_client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.lead_master_pool(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Interaction data
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('captured', 'converted', 'qualified', 'disqualified', 'won', 'lost')),
  client_sector TEXT,
  
  -- Values
  value NUMERIC DEFAULT 0,
  
  -- Origin
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Lead Export History (track exports to Meta/Google)
CREATE TABLE public.lead_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  audience_id UUID REFERENCES public.meta_audiences(id) ON DELETE SET NULL,
  
  export_type TEXT NOT NULL CHECK (export_type IN ('meta', 'google', 'csv')),
  segment_ids UUID[],
  filters_applied JSONB,
  
  leads_exported INTEGER DEFAULT 0,
  leads_matched INTEGER,
  match_rate NUMERIC,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Lead Master Pool indexes
CREATE INDEX idx_lead_pool_company ON public.lead_master_pool(company_id);
CREATE INDEX idx_lead_pool_email_hash ON public.lead_master_pool(company_id, email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX idx_lead_pool_phone_hash ON public.lead_master_pool(company_id, phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX idx_lead_pool_location ON public.lead_master_pool(company_id, state, city);
CREATE INDEX idx_lead_pool_score ON public.lead_master_pool(company_id, global_score DESC);
CREATE INDEX idx_lead_pool_first_client ON public.lead_master_pool(first_client_id);
CREATE INDEX idx_lead_pool_created ON public.lead_master_pool(company_id, created_at DESC);

-- Segment assignments indexes
CREATE INDEX idx_segment_assignments_lead ON public.lead_segment_assignments(lead_id);
CREATE INDEX idx_segment_assignments_segment ON public.lead_segment_assignments(segment_id);

-- Client interactions indexes
CREATE INDEX idx_interactions_lead ON public.lead_client_interactions(lead_id);
CREATE INDEX idx_interactions_client ON public.lead_client_interactions(client_id);
CREATE INDEX idx_interactions_sector ON public.lead_client_interactions(client_sector);
CREATE INDEX idx_interactions_company ON public.lead_client_interactions(company_id);
CREATE INDEX idx_interactions_type ON public.lead_client_interactions(interaction_type);

-- API Keys indexes
CREATE INDEX idx_api_keys_company ON public.company_api_keys(company_id);
CREATE INDEX idx_api_keys_hash ON public.company_api_keys(api_key_hash);

-- Export history indexes
CREATE INDEX idx_export_history_company ON public.lead_export_history(company_id);
CREATE INDEX idx_export_history_client ON public.lead_export_history(client_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.company_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_master_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_segment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_export_history ENABLE ROW LEVEL SECURITY;

-- Company API Keys policies (admin only)
CREATE POLICY "Admins can manage API keys"
  ON public.company_api_keys FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Lead Master Pool policies
CREATE POLICY "Company members can view leads"
  ON public.lead_master_pool FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can insert leads"
  ON public.lead_master_pool FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can update leads"
  ON public.lead_master_pool FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can delete leads"
  ON public.lead_master_pool FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- Lead Segments policies
CREATE POLICY "Company members can view segments"
  ON public.lead_segments FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage segments"
  ON public.lead_segments FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Lead Segment Assignments policies
CREATE POLICY "Company members can view segment assignments"
  ON public.lead_segment_assignments FOR SELECT
  USING (lead_id IN (
    SELECT id FROM public.lead_master_pool 
    WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Company members can manage segment assignments"
  ON public.lead_segment_assignments FOR ALL
  USING (lead_id IN (
    SELECT id FROM public.lead_master_pool 
    WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

-- Lead Client Interactions policies
CREATE POLICY "Company members can view interactions"
  ON public.lead_client_interactions FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can insert interactions"
  ON public.lead_client_interactions FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- Lead Export History policies
CREATE POLICY "Company members can view export history"
  ON public.lead_export_history FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can create exports"
  ON public.lead_export_history FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can update exports"
  ON public.lead_export_history FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_lead_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lead_pool_updated_at
  BEFORE UPDATE ON public.lead_master_pool
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_pool_updated_at();

CREATE TRIGGER trigger_lead_segments_updated_at
  BEFORE UPDATE ON public.lead_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_pool_updated_at();