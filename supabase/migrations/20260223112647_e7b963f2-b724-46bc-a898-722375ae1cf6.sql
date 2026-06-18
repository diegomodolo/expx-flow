-- Table to persist per-user UI settings (e.g. timeline config)
CREATE TABLE IF NOT EXISTS public.user_ui_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, setting_key)
);;



ALTER TABLE public.user_ui_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage their own settings"
ON public.user_ui_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS update_user_ui_settings_updated_at ON public.user_ui_settings;
CREATE TRIGGER update_user_ui_settings_updated_at
BEFORE UPDATE ON public.user_ui_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_sync_jobs_updated_at();
