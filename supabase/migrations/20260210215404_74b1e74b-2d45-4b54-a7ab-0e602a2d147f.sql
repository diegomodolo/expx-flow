
-- Backfill author_member_id on existing messages using phone from provider_message_id
UPDATE groupops_messages msg
SET author_member_id = mb.id
FROM groupops_members mb
WHERE msg.author_member_id IS NULL
  AND mb.group_id = msg.group_id
  AND mb.phone_e164 = '+' || split_part(msg.provider_message_id, ':', 1)
  AND msg.provider_message_id IS NOT NULL
  AND msg.provider_message_id LIKE '%:%';
