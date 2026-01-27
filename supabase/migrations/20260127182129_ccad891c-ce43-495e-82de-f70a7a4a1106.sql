-- Adicionar constraint UNIQUE para permitir upsert de conversas
-- Uma conversa é única por company_id + instance_id + phone
ALTER TABLE public.whatsapp_conversations 
ADD CONSTRAINT whatsapp_conversations_company_instance_phone_unique 
UNIQUE (company_id, instance_id, phone);