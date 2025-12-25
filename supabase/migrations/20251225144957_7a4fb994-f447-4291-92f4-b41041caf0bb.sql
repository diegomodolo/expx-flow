-- Add reference image columns to instagram_auto_post_configs table
-- These are used specifically for auto-post image generation (separate from client's campaign reference images)

ALTER TABLE instagram_auto_post_configs
ADD COLUMN reference_image_1 TEXT,
ADD COLUMN reference_image_2 TEXT,
ADD COLUMN reference_image_3 TEXT;

-- Add comment explaining purpose
COMMENT ON COLUMN instagram_auto_post_configs.reference_image_1 IS 'First reference image URL for AI image generation (specific to auto-posts)';
COMMENT ON COLUMN instagram_auto_post_configs.reference_image_2 IS 'Second reference image URL for AI image generation (specific to auto-posts)';
COMMENT ON COLUMN instagram_auto_post_configs.reference_image_3 IS 'Third reference image URL for AI image generation (specific to auto-posts)';