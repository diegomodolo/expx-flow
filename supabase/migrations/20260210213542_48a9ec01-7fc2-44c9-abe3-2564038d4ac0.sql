-- Add unique constraint on provider_message_id for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_groupops_messages_provider_message_id 
ON public.groupops_messages (provider_message_id) 
WHERE provider_message_id IS NOT NULL;