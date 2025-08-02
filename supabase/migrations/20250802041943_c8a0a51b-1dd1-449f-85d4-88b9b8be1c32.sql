-- Criar tabela para concorrentes dos clientes
CREATE TABLE public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  facebook_page_name TEXT,
  instagram_handle TEXT,
  website_url TEXT,
  industry TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para criativos dos concorrentes
CREATE TABLE public.competitor_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL,
  client_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Facebook Ads',
  ad_title TEXT,
  ad_description TEXT,
  ad_copy TEXT,
  call_to_action TEXT,
  image_url TEXT,
  video_url TEXT,
  landing_page_url TEXT,
  ad_type TEXT, -- image, video, carousel, etc
  estimated_performance TEXT, -- high, medium, low
  notes TEXT,
  date_spotted DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_ads ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para competitors
CREATE POLICY "Company members can view competitors" 
ON public.competitors 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create competitors" 
ON public.competitors 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can update competitors" 
ON public.competitors 
FOR UPDATE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can delete competitors" 
ON public.competitors 
FOR DELETE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Criar políticas RLS para competitor_ads
CREATE POLICY "Company members can view competitor ads" 
ON public.competitor_ads 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create competitor ads" 
ON public.competitor_ads 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can update competitor ads" 
ON public.competitor_ads 
FOR UPDATE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can delete competitor ads" 
ON public.competitor_ads 
FOR DELETE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_competitors_updated_at
BEFORE UPDATE ON public.competitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitor_ads_updated_at
BEFORE UPDATE ON public.competitor_ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();