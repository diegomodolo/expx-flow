-- Remover a constraint única atual (company_id + phone)
ALTER TABLE whatsapp_conversations 
DROP CONSTRAINT IF EXISTS whatsapp_conversations_company_id_phone_key;

-- Criar nova constraint única (company_id + instance_id + phone)
-- Isso permite que o mesmo número tenha conversas separadas em instâncias diferentes
ALTER TABLE whatsapp_conversations 
ADD CONSTRAINT whatsapp_conversations_company_instance_phone_key 
UNIQUE (company_id, instance_id, phone);