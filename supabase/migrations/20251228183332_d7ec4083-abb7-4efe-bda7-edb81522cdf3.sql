-- Add carousel support columns to instagram_auto_post_configs
ALTER TABLE public.instagram_auto_post_configs
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'single',
ADD COLUMN IF NOT EXISTS carousel_min_images INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS carousel_max_images INTEGER DEFAULT 5;


-- Add carousel support columns to instagram_auto_posts
ALTER TABLE public.instagram_auto_posts
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'single';
DO $$ BEGIN
  ALTER TABLE public.instagram_auto_post_configs
ADD CONSTRAINT check_post_type CHECK (post_type IN ('single', 'carousel'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.instagram_auto_posts
ADD CONSTRAINT check_post_type_posts CHECK (post_type IN ('single', 'carousel'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.instagram_auto_post_configs
ADD CONSTRAINT check_carousel_min CHECK (carousel_min_images >= 2 AND carousel_min_images <= 10),
ADD CONSTRAINT check_carousel_max CHECK (carousel_max_images >= 2 AND carousel_max_images <= 10),
ADD CONSTRAINT check_carousel_range CHECK (carousel_min_images <= carousel_max_images);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
