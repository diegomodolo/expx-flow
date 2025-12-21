-- Add listacnae_token column to company_settings table
-- This stores the API token for ListaCNAE integration per company

-- First check if company_settings table exists, if not create it
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  listacnae_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Add column if table already exists but column doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings' 
    AND column_name = 'listacnae_token'
  ) THEN
    ALTER TABLE public.company_settings ADD COLUMN listacnae_token TEXT;
  END IF;
END $$;

-- Create RLS policies for company_settings
DROP POLICY IF EXISTS "Users can view settings of their companies" ON public.company_settings;
CREATE POLICY "Users can view settings of their companies" 
ON public.company_settings 
FOR SELECT 
USING (
  company_id IN (
    SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert settings for their companies" ON public.company_settings;
CREATE POLICY "Admins can insert settings for their companies" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (
  public.is_company_admin_or_owner(auth.uid(), company_id)
);

DROP POLICY IF EXISTS "Admins can update settings of their companies" ON public.company_settings;
CREATE POLICY "Admins can update settings of their companies" 
ON public.company_settings 
FOR UPDATE 
USING (
  public.is_company_admin_or_owner(auth.uid(), company_id)
);

DROP POLICY IF EXISTS "Admins can delete settings of their companies" ON public.company_settings;
CREATE POLICY "Admins can delete settings of their companies" 
ON public.company_settings 
FOR DELETE 
USING (
  public.is_company_admin_or_owner(auth.uid(), company_id)
);