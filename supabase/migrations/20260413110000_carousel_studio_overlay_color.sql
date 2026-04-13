-- Adiciona cor customizável ao overlay dos slides do Carousel Studio
ALTER TABLE carousel_studio_slides
  ADD COLUMN IF NOT EXISTS overlay_color text DEFAULT NULL;
