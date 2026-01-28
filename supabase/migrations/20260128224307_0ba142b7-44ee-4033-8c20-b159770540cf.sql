-- Clean up duplicate analysis messages in whatsapp_ai_chat_messages
-- Keep only the first occurrence of each unique analysis per conversation

-- Step 1: Create a temp table with the IDs to keep (the earliest one for each conversation + content combo)
CREATE TEMP TABLE analysis_to_keep AS
SELECT DISTINCT ON (conversation_id, content) id
FROM whatsapp_ai_chat_messages
WHERE role = 'analysis'
ORDER BY conversation_id, content, created_at ASC;

-- Step 2: Delete all analysis messages that are not in the keep list
DELETE FROM whatsapp_ai_chat_messages
WHERE role = 'analysis'
AND id NOT IN (SELECT id FROM analysis_to_keep);

-- Step 3: Drop the temp table
DROP TABLE analysis_to_keep;

-- Step 4: Create a unique index to prevent future duplicates
-- Using a hash of the content to avoid index size issues with large JSON content
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_ai_chat_unique_analysis 
ON whatsapp_ai_chat_messages (conversation_id, md5(content))
WHERE role = 'analysis';