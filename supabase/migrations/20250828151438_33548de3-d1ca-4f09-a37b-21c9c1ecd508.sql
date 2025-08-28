-- Create period comparisons table to store comparison requests
CREATE TABLE public.period_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comparison_name TEXT NOT NULL,
  period_1_start DATE NOT NULL,
  period_1_end DATE NOT NULL,
  period_1_label TEXT NOT NULL,
  period_2_start DATE NOT NULL,
  period_2_end DATE NOT NULL,
  period_2_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, syncing, completed, error
  sync_progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create period comparison campaigns table
CREATE TABLE public.period_comparison_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comparison_id UUID NOT NULL REFERENCES period_comparisons(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL, -- 1 or 2
  facebook_campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  status TEXT NOT NULL,
  objective TEXT,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  quality_ranking TEXT,
  engagement_rate_ranking TEXT,
  conversion_rate_ranking TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create period comparison ad sets table
CREATE TABLE public.period_comparison_adsets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comparison_id UUID NOT NULL REFERENCES period_comparisons(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  facebook_adset_id TEXT NOT NULL,
  facebook_campaign_id TEXT NOT NULL,
  adset_name TEXT NOT NULL,
  status TEXT NOT NULL,
  daily_budget NUMERIC DEFAULT 0,
  lifetime_budget NUMERIC DEFAULT 0,
  bid_strategy TEXT,
  optimization_goal TEXT,
  targeting TEXT,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create period comparison ads table
CREATE TABLE public.period_comparison_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comparison_id UUID NOT NULL REFERENCES period_comparisons(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  facebook_ad_id TEXT NOT NULL,
  facebook_adset_id TEXT NOT NULL,
  facebook_campaign_id TEXT NOT NULL,
  ad_name TEXT NOT NULL,
  status TEXT NOT NULL,
  creative_type TEXT,
  creative_title TEXT,
  creative_body TEXT,
  creative_description TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  call_to_action TEXT,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  video_view_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.period_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_comparison_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_comparison_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_comparison_ads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for period_comparisons
CREATE POLICY "Company members can create period comparisons"
ON public.period_comparisons
FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can view period comparisons"
ON public.period_comparisons
FOR SELECT
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can update period comparisons"
ON public.period_comparisons
FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can delete period comparisons"
ON public.period_comparisons
FOR DELETE
USING (company_id IN (
  SELECT company_id FROM company_members WHERE user_id = auth.uid()
));

-- Create RLS policies for period_comparison_campaigns
CREATE POLICY "Company members can create period comparison campaigns"
ON public.period_comparison_campaigns
FOR INSERT
WITH CHECK (comparison_id IN (
  SELECT id FROM period_comparisons 
  WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Company members can view period comparison campaigns"
ON public.period_comparison_campaigns
FOR SELECT
USING (comparison_id IN (
  SELECT id FROM period_comparisons 
  WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
));

-- Create RLS policies for period_comparison_adsets
CREATE POLICY "Company members can create period comparison adsets"
ON public.period_comparison_adsets
FOR INSERT
WITH CHECK (comparison_id IN (
  SELECT id FROM period_comparisons 
  WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Company members can view period comparison adsets"
ON public.period_comparison_adsets
FOR SELECT
USING (comparison_id IN (
  SELECT id FROM period_comparisons 
  WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
));

-- Create RLS policies for period_comparison_ads
CREATE POLICY "Company members can create period comparison ads"
ON public.period_comparison_ads
FOR INSERT
WITH CHECK (comparison_id IN (
  SELECT id FROM period_comparisons 
  WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Company members can view period comparison ads"
ON public.period_comparison_ads
FOR SELECT
USING (comparison_id IN (
  SELECT id FROM period_comparisons 
  WHERE company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
));

-- Create indexes for better performance
CREATE INDEX idx_period_comparisons_client_id ON period_comparisons(client_id);
CREATE INDEX idx_period_comparisons_company_id ON period_comparisons(company_id);
CREATE INDEX idx_period_comparison_campaigns_comparison_id ON period_comparison_campaigns(comparison_id);
CREATE INDEX idx_period_comparison_campaigns_period ON period_comparison_campaigns(comparison_id, period_number);
CREATE INDEX idx_period_comparison_adsets_comparison_id ON period_comparison_adsets(comparison_id);
CREATE INDEX idx_period_comparison_adsets_period ON period_comparison_adsets(comparison_id, period_number);
CREATE INDEX idx_period_comparison_ads_comparison_id ON period_comparison_ads(comparison_id);
CREATE INDEX idx_period_comparison_ads_period ON period_comparison_ads(comparison_id, period_number);

-- Add trigger for updated_at
CREATE TRIGGER update_period_comparisons_updated_at
  BEFORE UPDATE ON period_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();