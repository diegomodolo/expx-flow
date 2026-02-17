
CREATE OR REPLACE FUNCTION public.auto_move_historia_from_backlog()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- Only act when task_state changes away from 'backlog'
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.task_state = NEW.task_state THEN
    RETURN NEW;
  END IF;
  IF OLD.task_state != 'backlog' THEN
    RETURN NEW;
  END IF;

  -- Count remaining backlog subtasks for the same parent
  SELECT COUNT(*) INTO v_remaining
  FROM public.tasks
  WHERE parent_task_id = NEW.parent_task_id
    AND id != NEW.id
    AND task_state = 'backlog';

  -- If no subtasks remain in backlog, move parent to planejamento
  IF v_remaining = 0 THEN
    UPDATE public.tasks
    SET task_state = 'planejamento'
    WHERE id = NEW.parent_task_id
      AND task_state = 'backlog';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_move_historia_from_backlog
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_move_historia_from_backlog();
