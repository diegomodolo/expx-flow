ALTER TABLE public.task_board_columns
DROP CONSTRAINT task_board_columns_status_check;
DO $$ BEGIN
  ALTER TABLE public.task_board_columns
ADD CONSTRAINT task_board_columns_status_check
CHECK (status IN ('todo', 'progress', 'review', 'done', 'waiting_approval', 'blocked', 'paused', 'cancelled'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
