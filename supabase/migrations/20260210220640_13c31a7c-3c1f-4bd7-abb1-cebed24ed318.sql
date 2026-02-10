
-- Reset corrupted author_member_id set by wrong backfill
-- The backfill incorrectly used the instance phone from provider_message_id prefix
UPDATE groupops_messages
SET author_member_id = NULL
WHERE author_member_id IS NOT NULL;
