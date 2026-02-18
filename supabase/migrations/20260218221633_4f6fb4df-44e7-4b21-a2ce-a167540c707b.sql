-- Remove FK constraint on ia_agent_conversations that prevents AI agents from creating conversations
-- AI agents use ia_agent_id as user_id which doesn't exist in auth.users
ALTER TABLE public.ia_agent_conversations DROP CONSTRAINT IF EXISTS ia_agent_conversations_user_id_fkey;
