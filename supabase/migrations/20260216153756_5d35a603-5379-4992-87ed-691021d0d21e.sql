-- Create discord_config table
CREATE TABLE IF NOT EXISTS public.discord_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  guild_id TEXT,
  guild_name TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);;



-- Enable RLS
ALTER TABLE public.discord_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view their company discord config"
  ON public.discord_config FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their company discord config"
  ON public.discord_config FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their company discord config"
  ON public.discord_config FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Add discord columns to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS discord_username TEXT;


-- Add discord channel to teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS discord_channel_id TEXT;

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS discord_channel_name TEXT;
DROP TRIGGER IF EXISTS update_discord_config_updated_at ON public.discord_config;
CREATE TRIGGER update_discord_config_updated_at
  BEFORE UPDATE ON public.discord_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
