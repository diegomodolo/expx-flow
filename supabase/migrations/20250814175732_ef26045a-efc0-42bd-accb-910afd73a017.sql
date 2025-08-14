-- Add foreign key relationship between ai_chat_conversations and clients
ALTER TABLE ai_chat_conversations 
ADD CONSTRAINT fk_ai_chat_conversations_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;