
-- Create polls table
CREATE TABLE public.internal_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.internal_channels(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create poll votes table
CREATE TABLE public.internal_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.internal_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Enable RLS
ALTER TABLE public.internal_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies for polls (readable by company members via channel)
CREATE POLICY "Authenticated users can view polls"
ON public.internal_polls FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create polls"
ON public.internal_polls FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Policies for votes
CREATE POLICY "Authenticated users can view votes"
ON public.internal_poll_votes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own votes"
ON public.internal_poll_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
ON public.internal_poll_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
