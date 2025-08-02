-- Add engagement and quality metrics columns to ads table
ALTER TABLE public.ads 
ADD COLUMN likes INTEGER DEFAULT 0,
ADD COLUMN comments INTEGER DEFAULT 0,
ADD COLUMN shares INTEGER DEFAULT 0,
ADD COLUMN video_views INTEGER DEFAULT 0,
ADD COLUMN video_view_percentage NUMERIC DEFAULT 0,
ADD COLUMN negative_feedback INTEGER DEFAULT 0,
ADD COLUMN video_completion_rate NUMERIC DEFAULT 0;

-- Add comment to describe the new columns
COMMENT ON COLUMN public.ads.likes IS 'Number of likes on the ad';
COMMENT ON COLUMN public.ads.comments IS 'Number of comments on the ad';
COMMENT ON COLUMN public.ads.shares IS 'Number of shares on the ad';
COMMENT ON COLUMN public.ads.video_views IS 'Number of video views (for video ads)';
COMMENT ON COLUMN public.ads.video_view_percentage IS 'Average video view percentage';
COMMENT ON COLUMN public.ads.negative_feedback IS 'Number of negative feedback actions';
COMMENT ON COLUMN public.ads.video_completion_rate IS 'Video completion rate percentage';