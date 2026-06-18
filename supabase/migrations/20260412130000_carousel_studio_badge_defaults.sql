-- Self-host: faltam colunas de badge no carousel_studio_slides.
-- Adiciona com IF NOT EXISTS antes de setar defaults.

ALTER TABLE carousel_studio_slides
  ADD COLUMN IF NOT EXISTS badge_position         text,
  ADD COLUMN IF NOT EXISTS badge_name_enabled     bool,
  ADD COLUMN IF NOT EXISTS badge_name_line_height int,
  ADD COLUMN IF NOT EXISTS badge_handle_position  text;

-- Defaults
ALTER TABLE carousel_studio_slides
  ALTER COLUMN badge_position         SET DEFAULT 'bottom_right',
  ALTER COLUMN badge_name_enabled     SET DEFAULT true,
  ALTER COLUMN badge_name_line_height SET DEFAULT -20,
  ALTER COLUMN badge_handle_position  SET DEFAULT 'right';
