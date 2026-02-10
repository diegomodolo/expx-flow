
-- Drop the partial index that doesn't work with ON CONFLICT
DROP INDEX IF EXISTS idx_groupops_messages_provider_message_id;

-- Add a proper unique constraint (PostgreSQL 15+ allows multiple NULLs)
ALTER TABLE public.groupops_messages 
ADD CONSTRAINT uq_groupops_messages_provider_message_id UNIQUE (provider_message_id);
