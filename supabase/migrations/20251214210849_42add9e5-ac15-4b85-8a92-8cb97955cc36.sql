-- Tabela de apresentações de conteúdo
CREATE TABLE IF NOT EXISTS public.content_presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  primary_color TEXT DEFAULT '#1a73e8',
  secondary_color TEXT DEFAULT '#ffffff',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  public_token TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);;

-- Tabela de criativos da apresentação
CREATE TABLE IF NOT EXISTS public.presentation_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id UUID NOT NULL REFERENCES public.content_presentations(id) ON DELETE CASCADE,
  creative_type TEXT NOT NULL CHECK (creative_type IN ('post_unico', 'carrossel', 'reels', 'stories')),
  order_index INTEGER NOT NULL DEFAULT 0,
  scheduled_date DATE,
  scheduled_time TIME,
  objective TEXT,
  headline TEXT,
  subheadline TEXT,
  caption TEXT,
  hashtags TEXT,
  script JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);;

-- Tabela de mídias dos criativos
CREATE TABLE IF NOT EXISTS public.creative_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_id UUID NOT NULL REFERENCES public.presentation_creatives(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  order_index INTEGER NOT NULL DEFAULT 0,
  slide_headline TEXT,
  slide_subheadline TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_content_presentations_client ON public.content_presentations(client_id);;

CREATE INDEX IF NOT EXISTS idx_content_presentations_company ON public.content_presentations(company_id);;

CREATE INDEX IF NOT EXISTS idx_content_presentations_status ON public.content_presentations(status);;

CREATE INDEX IF NOT EXISTS idx_content_presentations_public_token ON public.content_presentations(public_token);;

CREATE INDEX IF NOT EXISTS idx_presentation_creatives_presentation ON public.presentation_creatives(presentation_id);;

CREATE INDEX IF NOT EXISTS idx_creative_media_creative ON public.creative_media(creative_id);;



-- Enable RLS
ALTER TABLE public.content_presentations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.presentation_creatives ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.creative_media ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Company members can view presentations"
ON public.content_presentations FOR SELECT
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create presentations"
ON public.content_presentations FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update presentations"
ON public.content_presentations FOR UPDATE
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete presentations"
ON public.content_presentations FOR DELETE
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public presentations are viewable by anyone"
ON public.content_presentations FOR SELECT
USING (status = 'published' AND public_token IS NOT NULL);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can view creatives"
ON public.presentation_creatives FOR SELECT
USING (presentation_id IN (
  SELECT id FROM content_presentations 
  WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create creatives"
ON public.presentation_creatives FOR INSERT
WITH CHECK (presentation_id IN (
  SELECT id FROM content_presentations 
  WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update creatives"
ON public.presentation_creatives FOR UPDATE
USING (presentation_id IN (
  SELECT id FROM content_presentations 
  WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete creatives"
ON public.presentation_creatives FOR DELETE
USING (presentation_id IN (
  SELECT id FROM content_presentations 
  WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public creatives are viewable by anyone"
ON public.presentation_creatives FOR SELECT
USING (presentation_id IN (
  SELECT id FROM content_presentations 
  WHERE status = 'published' AND public_token IS NOT NULL
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can view media"
ON public.creative_media FOR SELECT
USING (creative_id IN (
  SELECT pc.id FROM presentation_creatives pc
  JOIN content_presentations cp ON pc.presentation_id = cp.id
  WHERE cp.company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create media"
ON public.creative_media FOR INSERT
WITH CHECK (creative_id IN (
  SELECT pc.id FROM presentation_creatives pc
  JOIN content_presentations cp ON pc.presentation_id = cp.id
  WHERE cp.company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update media"
ON public.creative_media FOR UPDATE
USING (creative_id IN (
  SELECT pc.id FROM presentation_creatives pc
  JOIN content_presentations cp ON pc.presentation_id = cp.id
  WHERE cp.company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete media"
ON public.creative_media FOR DELETE
USING (creative_id IN (
  SELECT pc.id FROM presentation_creatives pc
  JOIN content_presentations cp ON pc.presentation_id = cp.id
  WHERE cp.company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public media are viewable by anyone"
ON public.creative_media FOR SELECT
USING (creative_id IN (
  SELECT pc.id FROM presentation_creatives pc
  JOIN content_presentations cp ON pc.presentation_id = cp.id
  WHERE cp.status = 'published' AND cp.public_token IS NOT NULL
));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS update_content_presentations_updated_at ON public.content_presentations;
CREATE TRIGGER update_content_presentations_updated_at
BEFORE UPDATE ON public.content_presentations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_presentation_creatives_updated_at ON public.presentation_creatives;
CREATE TRIGGER update_presentation_creatives_updated_at
BEFORE UPDATE ON public.presentation_creatives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('presentation-media', 'presentation-media', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Anyone can view presentation media"
ON storage.objects FOR SELECT
USING (bucket_id = 'presentation-media');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload presentation media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'presentation-media' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their presentation media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'presentation-media' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their presentation media"
ON storage.objects FOR DELETE
USING (bucket_id = 'presentation-media' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
