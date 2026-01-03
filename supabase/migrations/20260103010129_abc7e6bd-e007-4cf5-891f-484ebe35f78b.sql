-- Add column to store preference for always generating images with text/headline
ALTER TABLE public.ad_generation_schedules 
ADD COLUMN always_include_text_in_images BOOLEAN NOT NULL DEFAULT true;