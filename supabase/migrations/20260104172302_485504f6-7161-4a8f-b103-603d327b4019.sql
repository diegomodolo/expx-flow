-- Add image_url field to content_plan_posts for storing creative images
ALTER TABLE content_plan_posts 
ADD COLUMN image_url TEXT;