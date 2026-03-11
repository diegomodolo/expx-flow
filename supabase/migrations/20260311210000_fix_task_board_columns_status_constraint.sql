ALTER TABLE public.task_board_columns
DROP CONSTRAINT task_board_columns_status_check;

ALTER TABLE public.task_board_columns
ADD CONSTRAINT task_board_columns_status_check
CHECK (status IN ('todo', 'progress', 'review', 'done', 'waiting_approval', 'blocked', 'paused', 'cancelled'));
