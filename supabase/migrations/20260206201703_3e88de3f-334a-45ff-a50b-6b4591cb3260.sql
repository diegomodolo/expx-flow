-- ==========================================
-- YouTube Content Lab - Database Structure
-- ==========================================

-- 1. Canais monitorados do YouTube
CREATE TABLE public.youtube_monitored_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_handle TEXT,
  thumbnail_url TEXT,
  subscriber_count BIGINT,
  video_count BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, channel_id)
);

-- 2. Cache de análises de vídeos
CREATE TABLE public.youtube_video_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.youtube_monitored_channels(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  view_count BIGINT NOT NULL DEFAULT 0,
  like_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  engagement_rate NUMERIC(10, 4),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_theme_analysis TEXT,
  ai_summary TEXT,
  UNIQUE(channel_id, video_id)
);

-- 3. Sugestões de conteúdo geradas pela IA
CREATE TABLE public.youtube_content_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  based_on_videos JSONB DEFAULT '[]'::jsonb,
  theme_category TEXT,
  estimated_engagement TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'scripted', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Roteiros de vídeos
CREATE TABLE public.youtube_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES public.youtube_content_suggestions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  script_content TEXT NOT NULL DEFAULT '',
  suggested_titles JSONB DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  reference_thumbnails JSONB DEFAULT '[]'::jsonb,
  video_duration_target INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'produced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 5. Mensagens do chat de refinamento
CREATE TABLE public.youtube_script_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.youtube_scripts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes para performance
CREATE INDEX idx_youtube_channels_client ON public.youtube_monitored_channels(client_id);
CREATE INDEX idx_youtube_channels_company ON public.youtube_monitored_channels(company_id);
CREATE INDEX idx_youtube_videos_channel ON public.youtube_video_analyses(channel_id);
CREATE INDEX idx_youtube_videos_published ON public.youtube_video_analyses(published_at DESC);
CREATE INDEX idx_youtube_videos_engagement ON public.youtube_video_analyses(engagement_rate DESC NULLS LAST);
CREATE INDEX idx_youtube_suggestions_client ON public.youtube_content_suggestions(client_id);
CREATE INDEX idx_youtube_scripts_client ON public.youtube_scripts(client_id);
CREATE INDEX idx_youtube_messages_script ON public.youtube_script_messages(script_id);

-- Habilitar RLS
ALTER TABLE public.youtube_monitored_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_script_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para youtube_monitored_channels
CREATE POLICY "Users can view channels from their company" ON public.youtube_monitored_channels
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert channels in their company" ON public.youtube_monitored_channels
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update channels in their company" ON public.youtube_monitored_channels
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete channels in their company" ON public.youtube_monitored_channels
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS Policies para youtube_video_analyses
CREATE POLICY "Users can view video analyses from their company" ON public.youtube_video_analyses
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert video analyses in their company" ON public.youtube_video_analyses
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update video analyses in their company" ON public.youtube_video_analyses
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS Policies para youtube_content_suggestions
CREATE POLICY "Users can view suggestions from their company" ON public.youtube_content_suggestions
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert suggestions in their company" ON public.youtube_content_suggestions
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update suggestions in their company" ON public.youtube_content_suggestions
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete suggestions in their company" ON public.youtube_content_suggestions
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS Policies para youtube_scripts
CREATE POLICY "Users can view scripts from their company" ON public.youtube_scripts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert scripts in their company" ON public.youtube_scripts
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update scripts in their company" ON public.youtube_scripts
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete scripts in their company" ON public.youtube_scripts
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS Policies para youtube_script_messages
CREATE POLICY "Users can view messages from their scripts" ON public.youtube_script_messages
  FOR SELECT USING (
    script_id IN (
      SELECT id FROM public.youtube_scripts WHERE 
        company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
        OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their scripts" ON public.youtube_script_messages
  FOR INSERT WITH CHECK (
    script_id IN (
      SELECT id FROM public.youtube_scripts WHERE 
        company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
        OR company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_youtube_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_youtube_suggestions_updated_at
  BEFORE UPDATE ON public.youtube_content_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_youtube_updated_at();

CREATE TRIGGER update_youtube_scripts_updated_at
  BEFORE UPDATE ON public.youtube_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_youtube_updated_at();