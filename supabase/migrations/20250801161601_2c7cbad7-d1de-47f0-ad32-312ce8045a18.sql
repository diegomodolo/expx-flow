-- Create sectors table
CREATE TABLE public.sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sectors" 
ON public.sectors 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sectors" 
ON public.sectors 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sectors" 
ON public.sectors 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sectors" 
ON public.sectors 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sectors_updated_at
  BEFORE UPDATE ON public.sectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default sectors for existing users
INSERT INTO public.sectors (name, user_id) 
SELECT DISTINCT 'Tecnologia', user_id FROM public.clients WHERE user_id IS NOT NULL;

INSERT INTO public.sectors (name, user_id) 
SELECT DISTINCT 'Educação', user_id FROM public.clients WHERE user_id IS NOT NULL;

INSERT INTO public.sectors (name, user_id) 
SELECT DISTINCT 'Saúde', user_id FROM public.clients WHERE user_id IS NOT NULL;

INSERT INTO public.sectors (name, user_id) 
SELECT DISTINCT 'Varejo', user_id FROM public.clients WHERE user_id IS NOT NULL;

INSERT INTO public.sectors (name, user_id) 
SELECT DISTINCT 'Financeiro', user_id FROM public.clients WHERE user_id IS NOT NULL;

INSERT INTO public.sectors (name, user_id) 
SELECT DISTINCT 'Marketing', user_id FROM public.clients WHERE user_id IS NOT NULL;