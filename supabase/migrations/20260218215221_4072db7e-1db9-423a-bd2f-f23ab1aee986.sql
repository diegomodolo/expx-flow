-- Remove FK constraint that prevents assigning tasks to AI agents
-- AI agents have user_ids (ia_agent_id) that don't exist in auth.users
ALTER TABLE public.tasks DROP CONSTRAINT tasks_user_id_fkey;