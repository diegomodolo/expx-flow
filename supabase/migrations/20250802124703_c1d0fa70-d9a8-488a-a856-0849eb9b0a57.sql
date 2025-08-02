-- Add ad library URL and last scrape timestamp to competitors table
ALTER TABLE public.competitors 
ADD COLUMN ad_library_url text,
ADD COLUMN last_scrape_at timestamp with time zone;