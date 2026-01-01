-- Add RSS-specific prompt field to instagram_auto_post_configs
ALTER TABLE instagram_auto_post_configs 
ADD COLUMN rss_feed_prompt TEXT;