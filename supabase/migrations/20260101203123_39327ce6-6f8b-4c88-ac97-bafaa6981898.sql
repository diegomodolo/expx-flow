-- Adicionar colunas de configuração de post na tabela de feeds RSS
ALTER TABLE public.instagram_autopost_rss_feeds
ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'carousel',
ADD COLUMN IF NOT EXISTS carousel_images integer NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS auto_generate boolean NOT NULL DEFAULT false;

-- Adicionar colunas de rastreamento de geração na tabela de itens RSS
ALTER TABLE public.instagram_autopost_rss_items
ADD COLUMN IF NOT EXISTS post_generated boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS generated_post_id uuid,
ADD COLUMN IF NOT EXISTS generated_at timestamptz;

-- Adicionar constraint para validar post_type
ALTER TABLE public.instagram_autopost_rss_feeds
ADD CONSTRAINT valid_post_type CHECK (post_type IN ('single', 'carousel'));

-- Adicionar constraint para validar carousel_images (1-10)
ALTER TABLE public.instagram_autopost_rss_feeds
ADD CONSTRAINT valid_carousel_images CHECK (carousel_images >= 1 AND carousel_images <= 10);

-- Índice para buscar itens que ainda não geraram posts
CREATE INDEX IF NOT EXISTS idx_rss_items_not_generated 
ON public.instagram_autopost_rss_items(feed_id, post_generated) 
WHERE post_generated = false;