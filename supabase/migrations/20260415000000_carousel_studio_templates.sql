-- supabase/migrations/20260415000000_carousel_studio_templates.sql

CREATE TABLE IF NOT EXISTS public.carousel_studio_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name             text NOT NULL,
  style            text NOT NULL DEFAULT 'minimalist',
  font_pair        text NOT NULL DEFAULT 'space_inter',
  accent_color     text NOT NULL DEFAULT '#FFD700',
  instagram_handle text,
  image_mode       text NOT NULL DEFAULT 'grid',
  slides_count     int NOT NULL DEFAULT 6,
  slides_config    jsonb NOT NULL DEFAULT '[]',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE public.carousel_studio_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "carousel_studio_templates: company members" ON public.carousel_studio_templates
  FOR ALL USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS set_carousel_studio_templates_updated_at ON public.carousel_studio_templates;
CREATE TRIGGER set_carousel_studio_templates_updated_at
  BEFORE UPDATE ON public.carousel_studio_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();



GRANT SELECT, INSERT, UPDATE, DELETE ON public.carousel_studio_templates TO authenticated;