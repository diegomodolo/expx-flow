-- Quando uma subtarefa é concluída, se a tarefa pai é uma História
-- e ainda está em status 'todo', muda automaticamente para 'progress' (Em Andamento)
CREATE OR REPLACE FUNCTION auto_progress_historia_on_subtask_done()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atua quando subtarefa muda para 'done'
  IF NEW.status = 'done' AND NEW.parent_task_id IS NOT NULL THEN
    UPDATE tasks
    SET status = 'progress'
    WHERE id = NEW.parent_task_id
      AND task_type = 'História'
      AND status = 'todo';

  END IF;

  RETURN NEW;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop trigger se existir para evitar duplicata
DROP TRIGGER IF EXISTS trg_auto_progress_historia_on_subtask_done ON tasks;
DROP TRIGGER IF EXISTS trg_auto_progress_historia_on_subtask_done ON tasks;
CREATE TRIGGER trg_auto_progress_historia_on_subtask_done
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (NEW.status = 'done' AND NEW.parent_task_id IS NOT NULL)
  EXECUTE FUNCTION auto_progress_historia_on_subtask_done();
