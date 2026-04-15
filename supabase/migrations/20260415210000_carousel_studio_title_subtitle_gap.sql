-- Espaçamento entre título e subtítulo (em px)
ALTER TABLE public.carousel_studio_slides
  ADD COLUMN IF NOT EXISTS title_subtitle_gap int NOT NULL DEFAULT 12;
