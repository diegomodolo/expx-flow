-- Adicionar campos de configuração visual de apresentação na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS presentation_logo TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS presentation_bg_image TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS presentation_overlay_color TEXT DEFAULT '#1a73e8';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS presentation_overlay_opacity NUMERIC DEFAULT 0.7;

-- Comentários para documentação
COMMENT ON COLUMN clients.presentation_logo IS 'URL da logo grande para apresentações';
COMMENT ON COLUMN clients.presentation_bg_image IS 'URL da imagem de fundo para capa da apresentação';
COMMENT ON COLUMN clients.presentation_overlay_color IS 'Cor hex do overlay sobre a imagem de fundo';
COMMENT ON COLUMN clients.presentation_overlay_opacity IS 'Opacidade do overlay (0 a 1)';