-- Add column for uploaded complete video
ALTER TABLE public.content_plan_posts 
ADD COLUMN IF NOT EXISTS reels_uploaded_video_url text;