
-- Drop the old check constraint and recreate it with 'dm' support
ALTER TABLE public.internal_channels 
DROP CONSTRAINT internal_channels_channel_type_check;

ALTER TABLE public.internal_channels 
ADD CONSTRAINT internal_channels_channel_type_check 
CHECK (channel_type = ANY (ARRAY['squad'::text, 'client'::text, 'general'::text, 'dm'::text]));
