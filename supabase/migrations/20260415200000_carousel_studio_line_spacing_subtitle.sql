-- Espaçamento de linha separado para subtítulo
ALTER TABLE public.carousel_studio_slides
  ADD COLUMN IF NOT EXISTS line_spacing_subtitle int NOT NULL DEFAULT 105;
