-- Add YouTube channel URL column to clients table
ALTER TABLE public.clients 
ADD COLUMN youtube_channel_url TEXT;