-- Add default publishing configuration columns to ad_generation_schedules
ALTER TABLE public.ad_generation_schedules
ADD COLUMN IF NOT EXISTS default_destination_url TEXT,
ADD COLUMN IF NOT EXISTS default_primary_text TEXT,
ADD COLUMN IF NOT EXISTS default_headline TEXT,
ADD COLUMN IF NOT EXISTS default_description TEXT,
ADD COLUMN IF NOT EXISTS default_cta TEXT DEFAULT 'LEARN_MORE',
ADD COLUMN IF NOT EXISTS default_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS default_url_params TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.ad_generation_schedules.default_destination_url IS 'URL de destino padrão para os anúncios';
COMMENT ON COLUMN public.ad_generation_schedules.default_primary_text IS 'Texto principal padrão do anúncio';
COMMENT ON COLUMN public.ad_generation_schedules.default_headline IS 'Título padrão do anúncio';
COMMENT ON COLUMN public.ad_generation_schedules.default_description IS 'Descrição padrão do anúncio';
COMMENT ON COLUMN public.ad_generation_schedules.default_cta IS 'Call to Action padrão (LEARN_MORE, SHOP_NOW, etc)';
COMMENT ON COLUMN public.ad_generation_schedules.default_pixel_id IS 'ID do Pixel do Meta para rastreamento';
COMMENT ON COLUMN public.ad_generation_schedules.default_url_params IS 'Parâmetros UTM padrão para a URL';