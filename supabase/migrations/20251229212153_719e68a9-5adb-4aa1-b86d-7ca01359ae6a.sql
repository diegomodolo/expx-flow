-- Add separate prompt fields for single posts and carousels
ALTER TABLE public.instagram_auto_post_configs
ADD COLUMN single_post_prompt TEXT,
ADD COLUMN carousel_prompt TEXT;

-- Migrate existing post_briefing to both fields as initial values
UPDATE public.instagram_auto_post_configs
SET 
  single_post_prompt = post_briefing,
  carousel_prompt = post_briefing
WHERE post_briefing IS NOT NULL;