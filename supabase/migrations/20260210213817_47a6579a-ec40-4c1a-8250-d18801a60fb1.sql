
-- Drop the partial index that doesn't work with ON CONFLICT
DROP INDEX IF EXISTS idx_groupops_messages_provider_message_id;
DO $$ BEGIN
  ALTER TABLE public.groupops_messages 
ADD CONSTRAINT uq_groupops_messages_provider_message_id UNIQUE (provider_message_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
