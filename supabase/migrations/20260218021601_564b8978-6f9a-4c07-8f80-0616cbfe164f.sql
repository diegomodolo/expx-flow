
-- Table for hand raises in channels
CREATE TABLE public.channel_hand_raises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.internal_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL DEFAULT 'Usuário',
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.channel_hand_raises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view hand raises in their company channels"
ON public.channel_hand_raises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM internal_channels ic
    JOIN company_members cm ON cm.company_id = ic.company_id
    WHERE ic.id = channel_hand_raises.channel_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can raise their own hand"
ON public.channel_hand_raises FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can dismiss their own hand raise"
ON public.channel_hand_raises FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hand raise"
ON public.channel_hand_raises FOR DELETE
USING (auth.uid() = user_id);
