-- Adiciona suporte a bullet points independentes nos slides do Carousel Studio
ALTER TABLE carousel_studio_slides
  ADD COLUMN IF NOT EXISTS bullets_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bullets_json text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bullet_icon text NOT NULL DEFAULT 'circle',
  ADD COLUMN IF NOT EXISTS bullet_icon_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bullet_icon_size integer NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS bullet_box_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bullet_box_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bullet_box_radius integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS bullet_box_padding_x integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS bullet_box_padding_y integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS bullet_font_size integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS bullet_line_height numeric NOT NULL DEFAULT 1.4,
  ADD COLUMN IF NOT EXISTS bullet_gap integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS bullet_position text NOT NULL DEFAULT 'mid_left',
  ADD COLUMN IF NOT EXISTS bullet_alignment text NOT NULL DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS bullet_padding_x integer NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS bullet_padding_y integer NOT NULL DEFAULT 64;