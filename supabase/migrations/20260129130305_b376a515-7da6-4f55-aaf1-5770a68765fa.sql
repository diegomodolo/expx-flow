-- Adicionar coluna de categoria/tipo da instância WhatsApp
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS instance_type text DEFAULT 'general';

-- Criar um tipo enum para os tipos de instância (comentado, pois usaremos text simples para flexibilidade)
COMMENT ON COLUMN public.whatsapp_instances.instance_type IS 'Tipo/categoria da instância: support, cs, commercial, financial, administrative, general';