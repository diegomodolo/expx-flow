-- Add reference_image columns 7-10 for carousel_generation_schedules
ALTER TABLE public.carousel_generation_schedules
ADD COLUMN IF NOT EXISTS reference_image_7 text,
ADD COLUMN IF NOT EXISTS reference_image_8 text,
ADD COLUMN IF NOT EXISTS reference_image_9 text,
ADD COLUMN IF NOT EXISTS reference_image_10 text;