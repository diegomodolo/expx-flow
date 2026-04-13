-- Adiciona margens configuráveis para a imagem de conteúdo
ALTER TABLE carousel_studio_slides
  ADD COLUMN IF NOT EXISTS content_image_margin_top    integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS content_image_margin_bottom integer NOT NULL DEFAULT 24;
