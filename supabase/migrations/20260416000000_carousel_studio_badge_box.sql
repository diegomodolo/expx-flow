-- Adiciona suporte a fundo (box) configurável no Badge de Perfil
ALTER TABLE carousel_studio_slides
  ADD COLUMN badge_box_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN badge_box_color   text             DEFAULT '#000000',
  ADD COLUMN badge_box_opacity integer NOT NULL DEFAULT 50,
  ADD COLUMN badge_box_radius  integer NOT NULL DEFAULT 16;
