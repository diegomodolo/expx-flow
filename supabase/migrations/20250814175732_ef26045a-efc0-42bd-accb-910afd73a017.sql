DO $$ BEGIN
  ALTER TABLE ai_chat_conversations 
ADD CONSTRAINT fk_ai_chat_conversations_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
