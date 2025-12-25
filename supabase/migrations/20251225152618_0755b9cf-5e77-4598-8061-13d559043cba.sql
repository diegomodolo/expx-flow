-- Make client_id optional for standalone automations
ALTER TABLE public.instagram_auto_post_configs 
ALTER COLUMN client_id DROP NOT NULL;

-- Add name field for identifying automations
ALTER TABLE public.instagram_auto_post_configs 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Make client_id optional on instagram_auto_posts as well
ALTER TABLE public.instagram_auto_posts 
ALTER COLUMN client_id DROP NOT NULL;