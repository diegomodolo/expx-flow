
-- Add topic_title column to internal_messages for topic messages
ALTER TABLE public.internal_messages
  ADD COLUMN IF NOT EXISTS topic_title text;