
-- Drop FK constraints that prevent AI agents from inserting into task_history and task_outputs
-- AI agents have user_ids that are NOT in auth.users (they're ia_agents mapped as employees)
ALTER TABLE public.task_history DROP CONSTRAINT IF EXISTS task_history_user_id_fkey;
ALTER TABLE public.task_outputs DROP CONSTRAINT IF EXISTS task_outputs_user_id_fkey;
