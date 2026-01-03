-- Adicionar colunas de configuração avançada na tabela ad_generation_schedules
ALTER TABLE public.ad_generation_schedules 
ADD COLUMN IF NOT EXISTS target_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_adset_id UUID REFERENCES public.ad_sets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS custom_image_prompt TEXT,
ADD COLUMN IF NOT EXISTS reference_image_1 TEXT,
ADD COLUMN IF NOT EXISTS reference_image_2 TEXT,
ADD COLUMN IF NOT EXISTS reference_image_3 TEXT,
ADD COLUMN IF NOT EXISTS reference_image_4 TEXT,
ADD COLUMN IF NOT EXISTS reference_image_5 TEXT,
ADD COLUMN IF NOT EXISTS reference_image_6 TEXT;

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_ad_generation_schedules_target_campaign 
ON public.ad_generation_schedules(target_campaign_id);

CREATE INDEX IF NOT EXISTS idx_ad_generation_schedules_target_adset 
ON public.ad_generation_schedules(target_adset_id);