-- Add pixel_id column to ads table to store the conversion pixel for each ad
ALTER TABLE public.ads 
ADD COLUMN pixel_id TEXT;

-- Add pixel_id column to ad_sets table for consistency
ALTER TABLE public.ad_sets 
ADD COLUMN pixel_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.ads.pixel_id IS 'Meta Pixel ID used for conversion tracking on this ad';
COMMENT ON COLUMN public.ad_sets.pixel_id IS 'Meta Pixel ID used for conversion tracking on this ad set';