-- Corrige default do badge_position para bottom_center (centralizado na parte de baixo)
ALTER TABLE carousel_studio_slides
  ALTER COLUMN badge_position SET DEFAULT 'bottom_center';