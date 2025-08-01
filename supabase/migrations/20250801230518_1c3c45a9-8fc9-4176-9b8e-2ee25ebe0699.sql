-- Create ad_sets table for Facebook ad sets
CREATE TABLE public.ad_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facebook_id TEXT NOT NULL UNIQUE,
  campaign_id UUID NOT NULL,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  company_id UUID,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  daily_budget NUMERIC DEFAULT 0,
  lifetime_budget NUMERIC DEFAULT 0,
  bid_strategy TEXT,
  optimization_goal TEXT,
  targeting TEXT,
  cpm NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ads table for Facebook ads/creatives
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facebook_id TEXT NOT NULL UNIQUE,
  ad_set_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  company_id UUID,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  creative_type TEXT,
  creative_body TEXT,
  creative_title TEXT,
  creative_description TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  call_to_action TEXT,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create policies for ad_sets
CREATE POLICY "Company members can view ad_sets" 
ON public.ad_sets 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create ad_sets" 
ON public.ad_sets 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can update ad_sets" 
ON public.ad_sets 
FOR UPDATE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can delete ad_sets" 
ON public.ad_sets 
FOR DELETE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Create policies for ads
CREATE POLICY "Company members can view ads" 
ON public.ads 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create ads" 
ON public.ads 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can update ads" 
ON public.ads 
FOR UPDATE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can delete ads" 
ON public.ads 
FOR DELETE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Create indexes for better performance
CREATE INDEX idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX idx_ad_sets_client_id ON public.ad_sets(client_id);
CREATE INDEX idx_ad_sets_facebook_id ON public.ad_sets(facebook_id);
CREATE INDEX idx_ad_sets_company_id ON public.ad_sets(company_id);

CREATE INDEX idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX idx_ads_campaign_id ON public.ads(campaign_id);
CREATE INDEX idx_ads_client_id ON public.ads(client_id);
CREATE INDEX idx_ads_facebook_id ON public.ads(facebook_id);
CREATE INDEX idx_ads_company_id ON public.ads(company_id);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_ad_sets_updated_at
BEFORE UPDATE ON public.ad_sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();