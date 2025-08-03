-- Create table for generated campaigns
CREATE TABLE public.generated_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  funnel_stage TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  creatives JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.generated_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for company access
CREATE POLICY "Company members can view generated campaigns" 
ON public.generated_campaigns 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create generated campaigns" 
ON public.generated_campaigns 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can update generated campaigns" 
ON public.generated_campaigns 
FOR UPDATE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can delete generated campaigns" 
ON public.generated_campaigns 
FOR DELETE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_generated_campaigns_updated_at
BEFORE UPDATE ON public.generated_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();