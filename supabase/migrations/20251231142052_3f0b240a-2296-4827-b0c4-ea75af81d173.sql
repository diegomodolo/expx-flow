-- Adicionar colunas para suporte a vídeo na tabela visual_creatives
ALTER TABLE visual_creatives 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image',
ADD COLUMN IF NOT EXISTS generation_operation_id TEXT,
ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;

-- Criar índice para operações em andamento (para polling eficiente)
CREATE INDEX IF NOT EXISTS idx_visual_creatives_operation 
ON visual_creatives(generation_operation_id) 
WHERE generation_operation_id IS NOT NULL;

-- Criar índice para filtrar por tipo de mídia
CREATE INDEX IF NOT EXISTS idx_visual_creatives_media_type 
ON visual_creatives(media_type);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN visual_creatives.video_url IS 'URL do vídeo gerado armazenado no Supabase Storage';
COMMENT ON COLUMN visual_creatives.media_type IS 'Tipo de mídia: image ou video';
COMMENT ON COLUMN visual_creatives.generation_operation_id IS 'ID da operação do Vertex AI para polling de status';
COMMENT ON COLUMN visual_creatives.video_duration_seconds IS 'Duração do vídeo em segundos';