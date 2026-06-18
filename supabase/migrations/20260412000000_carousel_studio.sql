-- supabase/migrations/20260412000000_carousel_studio.sql

-- Tabela principal de projetos
CREATE TABLE IF NOT EXISTS public.carousel_studio_projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id        uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Carrossel sem título',
  style            text NOT NULL DEFAULT 'minimalist' CHECK (style IN ('minimalist', 'profile')),
  font_pair        text NOT NULL DEFAULT 'space_inter',
  accent_color     text NOT NULL DEFAULT '#FFD700',
  instagram_handle text,
  slides_count     int NOT NULL DEFAULT 6,
  image_mode       text NOT NULL DEFAULT 'grid' CHECK (image_mode IN ('none', 'background', 'grid', 'both')),
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready')),
  thumbnail_url    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);;



ALTER TABLE public.carousel_studio_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "company members can manage carousel studio projects"
  ON public.carousel_studio_projects
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.carousel_studio_projects TO authenticated;
-- Tabela de slides
CREATE TABLE IF NOT EXISTS public.carousel_studio_slides (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid NOT NULL REFERENCES public.carousel_studio_projects(id) ON DELETE CASCADE,
  slide_number       int NOT NULL,
  headline           text,
  subtitle           text,
  visual_description text,
  bg_image_url       text,
  bg_position_x      int NOT NULL DEFAULT 50,
  bg_position_y      int NOT NULL DEFAULT 50,
  bg_zoom            int NOT NULL DEFAULT 100,
  overlay_style      text NOT NULL DEFAULT 'base' CHECK (overlay_style IN ('base', 'top_strong', 'base_strong', 'none')),
  overlay_opacity    int NOT NULL DEFAULT 60,
  text_position      text NOT NULL DEFAULT 'bottom_left',
  text_alignment     text NOT NULL DEFAULT 'left',
  font_size_title    int NOT NULL DEFAULT 48,
  font_size_subtitle int NOT NULL DEFAULT 20,
  line_spacing       int NOT NULL DEFAULT 120,
  corner_style       text NOT NULL DEFAULT 'none',
  corner_opacity     int NOT NULL DEFAULT 80,
  glass_enabled      bool NOT NULL DEFAULT false,
  glass_radius       int NOT NULL DEFAULT 12,
  badge_enabled      bool NOT NULL DEFAULT true,
  badge_photo_url    text,
  exported_image_url text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slide_number)
);;



ALTER TABLE public.carousel_studio_slides ENABLE ROW LEVEL SECURITY;


-- Função SECURITY DEFINER para evitar nested RLS em policy
CREATE OR REPLACE FUNCTION get_user_carousel_studio_project_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM public.carousel_studio_projects
  WHERE company_id IN (SELECT get_user_company_ids(auth.uid()));

$$;
DO $$ BEGIN
  CREATE POLICY "company members can manage carousel studio slides"
  ON public.carousel_studio_slides
  USING (project_id IN (SELECT get_user_carousel_studio_project_ids()))
  WITH CHECK (project_id IN (SELECT get_user_carousel_studio_project_ids()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.carousel_studio_slides TO authenticated;


-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_carousel_studio_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now();
 RETURN NEW;
 END;

$$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_carousel_studio_projects_updated_at ON public.carousel_studio_projects;
CREATE TRIGGER update_carousel_studio_projects_updated_at
  BEFORE UPDATE ON public.carousel_studio_projects
  FOR EACH ROW EXECUTE FUNCTION update_carousel_studio_updated_at();

DROP TRIGGER IF EXISTS update_carousel_studio_slides_updated_at ON public.carousel_studio_slides;
CREATE TRIGGER update_carousel_studio_slides_updated_at
  BEFORE UPDATE ON public.carousel_studio_slides
  FOR EACH ROW EXECUTE FUNCTION update_carousel_studio_updated_at();

CREATE INDEX IF NOT EXISTS idx_carousel_studio_slides_project_id
  ON public.carousel_studio_slides (project_id);;
