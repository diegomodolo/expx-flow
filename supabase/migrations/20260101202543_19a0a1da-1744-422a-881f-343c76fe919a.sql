-- Tabela para armazenar feeds RSS
CREATE TABLE public.instagram_autopost_rss_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.instagram_auto_post_configs(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  feed_name TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(config_id, feed_url)
);

-- Tabela para armazenar itens/artigos do RSS
CREATE TABLE public.instagram_autopost_rss_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES public.instagram_autopost_rss_feeds(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.instagram_auto_post_configs(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT,
  description TEXT,
  published_at TIMESTAMPTZ,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(feed_id, guid)
);

-- Enable RLS
ALTER TABLE public.instagram_autopost_rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_autopost_rss_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feeds
CREATE POLICY "Users can view RSS feeds for their configs" 
ON public.instagram_autopost_rss_feeds FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert RSS feeds for their configs" 
ON public.instagram_autopost_rss_feeds FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update RSS feeds for their configs" 
ON public.instagram_autopost_rss_feeds FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete RSS feeds for their configs" 
ON public.instagram_autopost_rss_feeds FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

-- RLS Policies for items
CREATE POLICY "Users can view RSS items for their configs" 
ON public.instagram_autopost_rss_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update RSS items for their configs" 
ON public.instagram_autopost_rss_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete RSS items for their configs" 
ON public.instagram_autopost_rss_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

-- Service role policies for edge functions
CREATE POLICY "Service role can manage RSS feeds" 
ON public.instagram_autopost_rss_feeds FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage RSS items" 
ON public.instagram_autopost_rss_items FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX idx_rss_feeds_config_id ON public.instagram_autopost_rss_feeds(config_id);
CREATE INDEX idx_rss_items_feed_id ON public.instagram_autopost_rss_items(feed_id);
CREATE INDEX idx_rss_items_config_id ON public.instagram_autopost_rss_items(config_id);
CREATE INDEX idx_rss_items_published_at ON public.instagram_autopost_rss_items(published_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_rss_feeds_updated_at
  BEFORE UPDATE ON public.instagram_autopost_rss_feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();