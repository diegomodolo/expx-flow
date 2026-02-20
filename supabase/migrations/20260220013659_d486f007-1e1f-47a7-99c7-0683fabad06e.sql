
-- Create unified user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  action_url TEXT,
  action_metadata JSONB,
  source_type TEXT NOT NULL DEFAULT 'system',
  source_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread 
  ON public.user_notifications (user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created 
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_company 
  ON public.user_notifications (company_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Authenticated company members can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = user_notifications.company_id
        AND cm.user_id = auth.uid()
    )
  );

-- Service role can insert notifications (for edge functions)
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
