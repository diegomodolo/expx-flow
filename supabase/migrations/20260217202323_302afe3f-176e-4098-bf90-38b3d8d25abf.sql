
-- Trigger 1: Auto-set parent task_type to 'História' when a subtask is inserted
CREATE OR REPLACE FUNCTION public.auto_set_historia_on_subtask_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a subtask is inserted, set the parent's task_type to 'História'
  IF NEW.parent_task_id IS NOT NULL THEN
    UPDATE public.tasks
    SET task_type = 'História'
    WHERE id = NEW.parent_task_id
      AND (task_type IS NULL OR task_type != 'História');

  END IF;

  RETURN NEW;

END;

$$;
DROP TRIGGER IF EXISTS trg_auto_set_historia_on_subtask_insert ON public.tasks;
CREATE TRIGGER trg_auto_set_historia_on_subtask_insert
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  WHEN (NEW.parent_task_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_set_historia_on_subtask_insert();



-- Trigger 2: Auto-complete parent (História) when all subtasks are done
CREATE OR REPLACE FUNCTION public.auto_complete_historia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id UUID;

  v_pending_count INTEGER;

BEGIN
  -- Only act when status changes to 'done'
  IF NEW.status != 'done' OR OLD.status = 'done' THEN
    RETURN NEW;

  END IF;


  -- Only act on subtasks
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;

  END IF;


  v_parent_id := NEW.parent_task_id;


  -- Count pending (non-done) sibling subtasks (excluding ghosts)
  SELECT COUNT(*) INTO v_pending_count
  FROM public.tasks
  WHERE parent_task_id = v_parent_id
    AND id != NEW.id
    AND status != 'done'
    AND origin != 'ghost';


  -- If no pending subtasks remain, complete the parent
  IF v_pending_count = 0 THEN
    UPDATE public.tasks
    SET status = 'done',
        completed_at = NOW()
    WHERE id = v_parent_id
      AND status != 'done';

  END IF;


  RETURN NEW;

END;

$$;
DROP TRIGGER IF EXISTS trg_auto_complete_historia ON public.tasks;
CREATE TRIGGER trg_auto_complete_historia
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  WHEN (NEW.parent_task_id IS NOT NULL AND NEW.status = 'done')
  EXECUTE FUNCTION public.auto_complete_historia();



-- Trigger 3: If all subtasks are deleted, revert task_type from História back to Tarefa
CREATE OR REPLACE FUNCTION public.auto_revert_historia_on_subtask_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining INTEGER;

BEGIN
  IF OLD.parent_task_id IS NULL THEN
    RETURN OLD;

  END IF;


  SELECT COUNT(*) INTO v_remaining
  FROM public.tasks
  WHERE parent_task_id = OLD.parent_task_id
    AND id != OLD.id;


  IF v_remaining = 0 THEN
    UPDATE public.tasks
    SET task_type = 'Tarefa'
    WHERE id = OLD.parent_task_id
      AND task_type = 'História';

  END IF;


  RETURN OLD;

END;

$$;
DROP TRIGGER IF EXISTS trg_auto_revert_historia_on_subtask_delete ON public.tasks;
CREATE TRIGGER trg_auto_revert_historia_on_subtask_delete
  AFTER DELETE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.parent_task_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_revert_historia_on_subtask_delete();
