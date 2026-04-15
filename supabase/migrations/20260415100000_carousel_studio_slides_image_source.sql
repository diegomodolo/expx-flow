ALTER TABLE public.carousel_studio_slides
  ADD COLUMN IF NOT EXISTS bg_image_source      text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS content_image_source text DEFAULT NULL;

-- Valid values: 'ai' | 'pexels' | 'manual' | NULL (no image)
-- Validation is done in TypeScript — no DB enum needed
COMMENT ON COLUMN public.carousel_studio_slides.bg_image_source      IS 'Origin of the background image: ai, pexels, manual, or NULL';
COMMENT ON COLUMN public.carousel_studio_slides.content_image_source IS 'Origin of the content image(s): ai, pexels, manual, or NULL';
