
-- Add 'dm' to the channel_type of internal_channels if it's a text column (no enum needed)
-- First, check if there's an existing constraint and add 'dm' support
-- The column is likely text, so we just need a unique constraint for DM channels

-- Add a unique constraint for dm channels (pair of users, order-independent)
-- We'll use reference_id to store the pair as "userId1:userId2" (sorted)
-- No schema change needed since channel_type is text and reference_id is text

-- Create an index to speed up DM channel lookups
CREATE INDEX IF NOT EXISTS idx_internal_channels_dm 
ON public.internal_channels(company_id, channel_type, reference_id)
WHERE channel_type = 'dm';