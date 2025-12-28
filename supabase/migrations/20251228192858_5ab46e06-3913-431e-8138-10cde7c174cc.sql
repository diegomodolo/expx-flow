-- Add youtube_channel_url column to instagram_auto_post_configs
ALTER TABLE public.instagram_auto_post_configs 
ADD COLUMN youtube_channel_url TEXT;