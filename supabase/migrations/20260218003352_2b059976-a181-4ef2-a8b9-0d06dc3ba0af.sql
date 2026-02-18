
-- Track when users last read each channel (for unread badges)
CREATE TABLE IF NOT EXISTS public.channel_read_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES public.internal_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.channel_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own read status"
  ON public.channel_read_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own read status"
  ON public.channel_read_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
  ON public.channel_read_status FOR UPDATE
  USING (auth.uid() = user_id);
