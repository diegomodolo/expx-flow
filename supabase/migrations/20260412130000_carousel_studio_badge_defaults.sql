-- Atualiza defaults do badge para novos carrosseis:
-- badge na parte de baixo, texto à direita, nome ativo, espaçamento -20px
ALTER TABLE carousel_studio_slides
  ALTER COLUMN badge_position         SET DEFAULT 'bottom_right',
  ALTER COLUMN badge_name_enabled     SET DEFAULT true,
  ALTER COLUMN badge_name_line_height SET DEFAULT -20,
  ALTER COLUMN badge_handle_position  SET DEFAULT 'right';
