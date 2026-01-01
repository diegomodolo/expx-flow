-- Add columns to enable cross-posting to Facebook
ALTER TABLE public.instagram_auto_post_configs
ADD COLUMN also_post_to_facebook BOOLEAN DEFAULT false,
ADD COLUMN facebook_page_id UUID REFERENCES public.facebook_pages(id);

-- Add index for faster lookups
CREATE INDEX idx_instagram_auto_post_configs_facebook_page_id 
ON public.instagram_auto_post_configs(facebook_page_id) 
WHERE facebook_page_id IS NOT NULL;