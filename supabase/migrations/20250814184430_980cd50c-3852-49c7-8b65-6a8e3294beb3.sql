-- Create content_generations table
CREATE TABLE public.content_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  client_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  theme TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for content_generations
CREATE POLICY "Company members can view content generations" 
ON public.content_generations 
FOR SELECT 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can create content generations" 
ON public.content_generations 
FOR INSERT 
WITH CHECK (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can update content generations" 
ON public.content_generations 
FOR UPDATE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

CREATE POLICY "Company members can delete content generations" 
ON public.content_generations 
FOR DELETE 
USING (company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE (company_members.user_id = auth.uid())));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_content_generations_updated_at
BEFORE UPDATE ON public.content_generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();