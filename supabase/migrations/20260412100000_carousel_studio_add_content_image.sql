-- Adiciona campos de imagem de conteúdo aos slides do Carousel Studio
ALTER TABLE carousel_studio_slides
  ADD COLUMN IF NOT EXISTS content_image_urls       text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS content_image_layout     text        NOT NULL DEFAULT '1_thumb_16_9',
  ADD COLUMN IF NOT EXISTS content_image_position   text        NOT NULL DEFAULT 'below_subtitle',
  ADD COLUMN IF NOT EXISTS content_image_radius     integer     NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS content_image_width      integer     NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS content_image_gap        integer     NOT NULL DEFAULT 12;