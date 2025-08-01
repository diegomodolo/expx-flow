-- Add traffic management fields to clients table
ALTER TABLE public.clients ADD COLUMN monthly_budget DECIMAL(10,2);
ALTER TABLE public.clients ADD COLUMN target_audience TEXT;
ALTER TABLE public.clients ADD COLUMN product_name TEXT;
ALTER TABLE public.clients ADD COLUMN voice_tone TEXT;
ALTER TABLE public.clients ADD COLUMN objectives TEXT;
ALTER TABLE public.clients ADD COLUMN preferred_platforms TEXT[];
ALTER TABLE public.clients ADD COLUMN campaign_type TEXT;
ALTER TABLE public.clients ADD COLUMN notes TEXT;

-- Create storage bucket for client avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('client-avatars', 'client-avatars', true);

-- Create storage policies for client avatars
CREATE POLICY "Client avatars are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'client-avatars');

CREATE POLICY "Users can upload client avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'client-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update client avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'client-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete client avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'client-avatars' AND auth.uid() IS NOT NULL);