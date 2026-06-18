-- Adiciona legenda e hashtags ao projeto do Carousel Studio
ALTER TABLE carousel_studio_projects
  ADD COLUMN IF NOT EXISTS caption text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hashtags text DEFAULT NULL;