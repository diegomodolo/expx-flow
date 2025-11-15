-- Create Google Ads integrations table
CREATE TABLE IF NOT EXISTS public.google_ads_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Google Ads accounts table
CREATE TABLE IF NOT EXISTS public.google_ads_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.google_ads_integrations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  google_customer_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  currency TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(google_customer_id, company_id)
);

-- Create Google campaigns table
CREATE TABLE IF NOT EXISTS public.google_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT NOT NULL,
  google_account_id UUID NOT NULL REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENABLED',
  campaign_type TEXT,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  period TEXT NOT NULL DEFAULT 'last_30_days',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(google_id, company_id, period)
);

-- Create Google ad groups table
CREATE TABLE IF NOT EXISTS public.google_ad_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.google_campaigns(id) ON DELETE CASCADE,
  google_account_id UUID NOT NULL REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENABLED',
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(google_id, company_id)
);

-- Create Google ads table
CREATE TABLE IF NOT EXISTS public.google_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT NOT NULL,
  ad_group_id UUID NOT NULL REFERENCES public.google_ad_groups(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.google_campaigns(id) ON DELETE CASCADE,
  google_account_id UUID NOT NULL REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENABLED',
  ad_type TEXT,
  headlines JSONB,
  descriptions JSONB,
  final_url TEXT,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(google_id, company_id)
);

-- Create Google Ads sync schedules table
CREATE TABLE IF NOT EXISTS public.google_ads_sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  executions_per_day INTEGER NOT NULL DEFAULT 1,
  scheduled_times TEXT[] NOT NULL DEFAULT '{}',
  last_execution_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add google_account_id to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS google_account_id UUID REFERENCES public.google_ads_accounts(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_ads_integrations_company ON public.google_ads_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_accounts_company ON public.google_ads_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_google_campaigns_client ON public.google_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_google_campaigns_company ON public.google_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_groups_campaign ON public.google_ad_groups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_groups_client ON public.google_ad_groups(client_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_ad_group ON public.google_ads(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_campaign ON public.google_ads(campaign_id);

-- Create RLS policies for google_ads_integrations
ALTER TABLE public.google_ads_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view Google integrations"
  ON public.google_ads_integrations FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create Google integrations"
  ON public.google_ads_integrations FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update Google integrations"
  ON public.google_ads_integrations FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete Google integrations"
  ON public.google_ads_integrations FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Create RLS policies for google_ads_accounts
ALTER TABLE public.google_ads_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view Google accounts"
  ON public.google_ads_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create Google accounts"
  ON public.google_ads_accounts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update Google accounts"
  ON public.google_ads_accounts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete Google accounts"
  ON public.google_ads_accounts FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Create RLS policies for google_campaigns
ALTER TABLE public.google_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view Google campaigns"
  ON public.google_campaigns FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create Google campaigns"
  ON public.google_campaigns FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update Google campaigns"
  ON public.google_campaigns FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete Google campaigns"
  ON public.google_campaigns FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Allow public read Google campaigns via client dashboard_token"
  ON public.google_campaigns FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE dashboard_token IS NOT NULL));

-- Create RLS policies for google_ad_groups
ALTER TABLE public.google_ad_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view Google ad groups"
  ON public.google_ad_groups FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create Google ad groups"
  ON public.google_ad_groups FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update Google ad groups"
  ON public.google_ad_groups FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete Google ad groups"
  ON public.google_ad_groups FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Allow public read Google ad groups via client dashboard_token"
  ON public.google_ad_groups FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE dashboard_token IS NOT NULL));

-- Create RLS policies for google_ads
ALTER TABLE public.google_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view Google ads"
  ON public.google_ads FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create Google ads"
  ON public.google_ads FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update Google ads"
  ON public.google_ads FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete Google ads"
  ON public.google_ads FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Allow public read Google ads via client dashboard_token"
  ON public.google_ads FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE dashboard_token IS NOT NULL));

-- Create RLS policies for google_ads_sync_schedules
ALTER TABLE public.google_ads_sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage Google sync schedules"
  ON public.google_ads_sync_schedules FOR ALL
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Create triggers for updated_at
CREATE TRIGGER update_google_ads_integrations_updated_at
  BEFORE UPDATE ON public.google_ads_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_ads_accounts_updated_at
  BEFORE UPDATE ON public.google_ads_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_campaigns_updated_at
  BEFORE UPDATE ON public.google_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_ad_groups_updated_at
  BEFORE UPDATE ON public.google_ad_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_ads_updated_at
  BEFORE UPDATE ON public.google_ads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_ads_sync_schedules_updated_at
  BEFORE UPDATE ON public.google_ads_sync_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();