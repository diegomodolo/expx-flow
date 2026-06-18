-- Table to track @mentions in internal messages
CREATE TABLE IF NOT EXISTS public.internal_message_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.internal_channels(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioner_user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);;

-- Index for fast unread mention lookups per user per channel
CREATE INDEX IF NOT EXISTS idx_mentions_user_channel ON public.internal_message_mentions(mentioned_user_id, channel_id, is_read);;

CREATE INDEX IF NOT EXISTS idx_mentions_message ON public.internal_message_mentions(message_id);;



-- Enable RLS
ALTER TABLE public.internal_message_mentions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own mentions"
  ON public.internal_message_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid());
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert mentions"
  ON public.internal_message_mentions FOR INSERT
  WITH CHECK (mentioner_user_id = auth.uid());
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own mentions"
  ON public.internal_message_mentions FOR UPDATE
  USING (mentioned_user_id = auth.uid());
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
