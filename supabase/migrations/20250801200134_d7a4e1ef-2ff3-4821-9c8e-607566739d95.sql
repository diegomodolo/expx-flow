-- Create Facebook integrations table
CREATE TABLE public.facebook_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Facebook ad accounts table
CREATE TABLE public.facebook_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.facebook_integrations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, account_id)
);

-- Enable RLS
ALTER TABLE public.facebook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for facebook_integrations
CREATE POLICY "Company members can view integrations" 
ON public.facebook_integrations 
FOR SELECT 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can create integrations" 
ON public.facebook_integrations 
FOR INSERT 
WITH CHECK (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can update integrations" 
ON public.facebook_integrations 
FOR UPDATE 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can delete integrations" 
ON public.facebook_integrations 
FOR DELETE 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Create RLS policies for facebook_ad_accounts
CREATE POLICY "Company members can view ad accounts" 
ON public.facebook_ad_accounts 
FOR SELECT 
USING (integration_id IN (
  SELECT fi.id
  FROM facebook_integrations fi
  JOIN company_members cm ON fi.company_id = cm.company_id
  WHERE cm.user_id = auth.uid()
));

CREATE POLICY "Company members can create ad accounts" 
ON public.facebook_ad_accounts 
FOR INSERT 
WITH CHECK (integration_id IN (
  SELECT fi.id
  FROM facebook_integrations fi
  JOIN company_members cm ON fi.company_id = cm.company_id
  WHERE cm.user_id = auth.uid()
));

CREATE POLICY "Company members can update ad accounts" 
ON public.facebook_ad_accounts 
FOR UPDATE 
USING (integration_id IN (
  SELECT fi.id
  FROM facebook_integrations fi
  JOIN company_members cm ON fi.company_id = cm.company_id
  WHERE cm.user_id = auth.uid()
));

CREATE POLICY "Company members can delete ad accounts" 
ON public.facebook_ad_accounts 
FOR DELETE 
USING (integration_id IN (
  SELECT fi.id
  FROM facebook_integrations fi
  JOIN company_members cm ON fi.company_id = cm.company_id
  WHERE cm.user_id = auth.uid()
));

-- Add updated_at triggers
CREATE TRIGGER update_facebook_integrations_updated_at
  BEFORE UPDATE ON public.facebook_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facebook_ad_accounts_updated_at
  BEFORE UPDATE ON public.facebook_ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint for company integrations
ALTER TABLE public.facebook_integrations 
ADD CONSTRAINT unique_company_integration UNIQUE (company_id);