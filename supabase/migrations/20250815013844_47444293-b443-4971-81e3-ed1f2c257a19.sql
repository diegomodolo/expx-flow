-- Create visual_creatives table
CREATE TABLE public.visual_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  client_id UUID NOT NULL,
  creative_type TEXT NOT NULL,
  theme TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  target_audience TEXT,
  copy_text TEXT,
  caption TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visual_creatives ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company members can create visual creatives" 
ON public.visual_creatives 
FOR INSERT 
WITH CHECK (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can view visual creatives" 
ON public.visual_creatives 
FOR SELECT 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can update visual creatives" 
ON public.visual_creatives 
FOR UPDATE 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

CREATE POLICY "Company members can delete visual creatives" 
ON public.visual_creatives 
FOR DELETE 
USING (company_id IN (
  SELECT company_members.company_id
  FROM company_members
  WHERE company_members.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_visual_creatives_updated_at
BEFORE UPDATE ON public.visual_creatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();