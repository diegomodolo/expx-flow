-- Atualiza defaults de fonte dos slides do Carousel Studio
ALTER TABLE carousel_studio_slides
  ALTER COLUMN font_size_title    SET DEFAULT 56,
  ALTER COLUMN font_size_subtitle SET DEFAULT 41,
  ALTER COLUMN line_spacing       SET DEFAULT 105;

-- Atualiza slides existentes que ainda usam os valores antigos padrão
UPDATE carousel_studio_slides
SET
  font_size_title    = 56,
  font_size_subtitle = 41,
  line_spacing       = 105
WHERE
  font_size_title    = 48
  AND font_size_subtitle = 20
  AND line_spacing       = 120;
