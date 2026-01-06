-- Add columns to content_plan_posts for Reels video generation
ALTER TABLE public.content_plan_posts 
ADD COLUMN IF NOT EXISTS reels_video_url TEXT,
ADD COLUMN IF NOT EXISTS reels_generation_status TEXT DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS reels_generation_progress JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.content_plan_posts.reels_video_url IS 'URL of the final concatenated Reels video';
COMMENT ON COLUMN public.content_plan_posts.reels_generation_status IS 'Status: idle, analyzing, generating, concatenating, completed, error';
COMMENT ON COLUMN public.content_plan_posts.reels_generation_progress IS 'Progress tracking for each scene: {scenes: [{status, videoUrl, prompt}], currentScene, totalScenes, error}';