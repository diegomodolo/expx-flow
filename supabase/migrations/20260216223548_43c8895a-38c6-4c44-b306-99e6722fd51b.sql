
-- Add 'flow' and 'ghost' to the task_origin enum
ALTER TYPE task_origin ADD VALUE IF NOT EXISTS 'flow';
ALTER TYPE task_origin ADD VALUE IF NOT EXISTS 'ghost';
