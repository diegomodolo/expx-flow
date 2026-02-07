-- Criar tabela de configurações de thumbnails
CREATE TABLE youtube_thumbnail_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  model_photos JSONB DEFAULT '[]'::jsonb,
  reference_thumbnails JSONB DEFAULT '[]'::jsonb,
  style_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, company_id)
);

-- Habilitar RLS
ALTER TABLE youtube_thumbnail_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their company thumbnail configs"
  ON youtube_thumbnail_configs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert thumbnail configs for their company"
  ON youtube_thumbnail_configs FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update thumbnail configs for their company"
  ON youtube_thumbnail_configs FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete thumbnail configs for their company"
  ON youtube_thumbnail_configs FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_youtube_thumbnail_configs_updated_at
  BEFORE UPDATE ON youtube_thumbnail_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();