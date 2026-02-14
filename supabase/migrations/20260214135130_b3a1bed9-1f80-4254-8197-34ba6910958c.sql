
-- Tabela de categorias de canais YouTube
CREATE TABLE public.youtube_channel_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de vínculo many-to-many entre categorias e canais
CREATE TABLE public.youtube_channel_category_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.youtube_channel_categories(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.youtube_monitored_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, channel_id)
);

-- Adicionar category_id nas sugestões e roteiros
ALTER TABLE public.youtube_content_suggestions
  ADD COLUMN category_id UUID REFERENCES public.youtube_channel_categories(id) ON DELETE SET NULL;

ALTER TABLE public.youtube_scripts
  ADD COLUMN category_id UUID REFERENCES public.youtube_channel_categories(id) ON DELETE SET NULL;

-- RLS para youtube_channel_categories
ALTER TABLE public.youtube_channel_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories of their company"
  ON public.youtube_channel_categories FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create categories for their company"
  ON public.youtube_channel_categories FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update categories of their company"
  ON public.youtube_channel_categories FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete categories of their company"
  ON public.youtube_channel_categories FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS para youtube_channel_category_links
ALTER TABLE public.youtube_channel_category_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view category links of their company"
  ON public.youtube_channel_category_links FOR SELECT
  USING (category_id IN (
    SELECT id FROM public.youtube_channel_categories
    WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
       OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can create category links for their company"
  ON public.youtube_channel_category_links FOR INSERT
  WITH CHECK (category_id IN (
    SELECT id FROM public.youtube_channel_categories
    WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
       OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can delete category links of their company"
  ON public.youtube_channel_category_links FOR DELETE
  USING (category_id IN (
    SELECT id FROM public.youtube_channel_categories
    WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
       OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  ));

-- Índices
CREATE INDEX idx_youtube_channel_categories_client ON public.youtube_channel_categories(client_id, company_id);
CREATE INDEX idx_youtube_channel_category_links_category ON public.youtube_channel_category_links(category_id);
CREATE INDEX idx_youtube_channel_category_links_channel ON public.youtube_channel_category_links(channel_id);
CREATE INDEX idx_youtube_content_suggestions_category ON public.youtube_content_suggestions(category_id);
CREATE INDEX idx_youtube_scripts_category ON public.youtube_scripts(category_id);

-- Trigger para updated_at
CREATE TRIGGER update_youtube_channel_categories_updated_at
  BEFORE UPDATE ON public.youtube_channel_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
