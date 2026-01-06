-- Add image_url column to content_plan_slides for carousel slide images
ALTER TABLE public.content_plan_slides
ADD COLUMN image_url TEXT;