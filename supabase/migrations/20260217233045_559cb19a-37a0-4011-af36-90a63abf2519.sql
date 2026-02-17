
-- Create internal_channels table
CREATE TABLE public.internal_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'general' CHECK (channel_type IN ('squad', 'client', 'general')),
  reference_id UUID,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create internal_messages table
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.internal_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  task_reference_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_internal_channels_company ON public.internal_channels(company_id);
CREATE INDEX idx_internal_messages_channel ON public.internal_messages(channel_id);
CREATE INDEX idx_internal_messages_created ON public.internal_messages(channel_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.internal_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check company membership (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- RLS for internal_channels
CREATE POLICY "Users can view channels of their company"
ON public.internal_channels FOR SELECT
TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Users can create channels in their company"
ON public.internal_channels FOR INSERT
TO authenticated
WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- RLS for internal_messages
CREATE POLICY "Users can view messages in their company channels"
ON public.internal_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.internal_channels ic
    WHERE ic.id = channel_id
    AND public.is_company_member(auth.uid(), ic.company_id)
  )
);

CREATE POLICY "Users can send messages in their company channels"
ON public.internal_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.internal_channels ic
    WHERE ic.id = channel_id
    AND public.is_company_member(auth.uid(), ic.company_id)
  )
);

CREATE POLICY "Users can delete their own messages"
ON public.internal_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
