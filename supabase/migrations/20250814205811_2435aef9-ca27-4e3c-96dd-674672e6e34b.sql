-- Create table for custom content prompts
CREATE TABLE public.content_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  default_prompt TEXT NOT NULL,
  custom_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, content_type)
);

-- Enable Row Level Security
ALTER TABLE public.content_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for content prompts
CREATE POLICY "Company members can view content prompts" 
ON public.content_prompts 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create content prompts" 
ON public.content_prompts 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can update content prompts" 
ON public.content_prompts 
FOR UPDATE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can delete content prompts" 
ON public.content_prompts 
FOR DELETE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_content_prompts_updated_at
BEFORE UPDATE ON public.content_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();