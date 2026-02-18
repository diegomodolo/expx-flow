
-- =============================================
-- 1. Auto-post task in squad channel (trigger)
-- =============================================

CREATE OR REPLACE FUNCTION public.auto_post_task_to_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_channel_id UUID;
  v_bot_user_id UUID := '00000000-0000-0000-0000-000000000000';
  v_task_msg TEXT;
BEGIN
  -- Only on new tasks with a team_id
  IF NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the squad channel for this team
  SELECT id INTO v_channel_id
  FROM public.internal_channels
  WHERE reference_id = NEW.team_id
    AND channel_type = 'squad'
  LIMIT 1;

  IF v_channel_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build message
  v_task_msg := '📋 Nova tarefa criada: **' || COALESCE(NEW.title, 'Sem título') || '**'
    || CASE WHEN NEW.responsible_name IS NOT NULL THEN E'\n👤 Responsável: ' || NEW.responsible_name ELSE '' END
    || CASE WHEN NEW.deadline IS NOT NULL THEN E'\n📅 Prazo: ' || NEW.deadline::TEXT ELSE '' END
    || E'\n🔗 #' || NEW.id::TEXT;

  INSERT INTO public.internal_messages (channel_id, user_id, content, task_reference_id)
  VALUES (v_channel_id, COALESCE(auth.uid(), v_bot_user_id), v_task_msg, NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_post_task_to_squad_channel
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.auto_post_task_to_channel();

-- =============================================
-- 2. Task comments from chat (Reply-to-Task)
-- =============================================

CREATE TABLE IF NOT EXISTS public.task_chat_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.internal_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_chat_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read task comments from their company"
ON public.task_chat_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid() AND cm.company_id = task_chat_comments.company_id
  )
);

CREATE POLICY "Users can insert task comments"
ON public.task_chat_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task comments"
ON public.task_chat_comments FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 3. Internal notifications table
-- =============================================

CREATE TABLE IF NOT EXISTS public.internal_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'message',
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  channel_id UUID REFERENCES public.internal_channels(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.internal_messages(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  ai_score NUMERIC,
  ai_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
ON public.internal_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.internal_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.internal_notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid() AND cm.company_id = internal_notifications.company_id
  )
);

CREATE INDEX idx_internal_notifications_user_unread
ON public.internal_notifications (user_id, is_read)
WHERE is_read = false;

CREATE INDEX idx_task_chat_comments_task
ON public.task_chat_comments (task_id);
