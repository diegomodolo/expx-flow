-- Add column to control whether date should appear in generated images
ALTER TABLE public.instagram_auto_post_configs
ADD COLUMN include_date_in_image boolean NOT NULL DEFAULT false;