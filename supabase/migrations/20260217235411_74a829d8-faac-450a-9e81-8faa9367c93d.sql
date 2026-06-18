
-- Add thread support columns to internal_messages
ALTER TABLE public.internal_messages
  ADD COLUMN IF NOT EXISTS thread_parent_id UUID REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'message';


-- Index for thread queries
CREATE INDEX IF NOT EXISTS idx_internal_messages_thread_parent ON public.internal_messages(thread_parent_id) WHERE thread_parent_id IS NOT NULL;


-- Function to auto-increment reply_count on parent when a thread reply is inserted
CREATE OR REPLACE FUNCTION public.update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_parent_id IS NOT NULL THEN
    UPDATE public.internal_messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.thread_parent_id;

  END IF;

  RETURN NEW;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_update_thread_reply_count ON public.internal_messages;
CREATE TRIGGER trg_update_thread_reply_count
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  WHEN (NEW.thread_parent_id IS NOT NULL)
  EXECUTE FUNCTION public.update_thread_reply_count();
