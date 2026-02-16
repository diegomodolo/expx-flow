
CREATE OR REPLACE FUNCTION public.cleanup_ghost_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a task is completed, delete its ghost cards
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    DELETE FROM public.tasks
    WHERE parent_task_id = NEW.id
      AND origin = 'ghost';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_cleanup_ghost_on_completion ON public.tasks;
CREATE TRIGGER trg_cleanup_ghost_on_completion
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_ghost_on_completion();
