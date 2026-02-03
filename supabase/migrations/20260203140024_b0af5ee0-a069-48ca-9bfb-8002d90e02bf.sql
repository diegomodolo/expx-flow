-- Adicionar coluna para controlar recebimento de mensagens de grupo na instância
ALTER TABLE whatsapp_instances 
ADD COLUMN IF NOT EXISTS receive_group_messages boolean DEFAULT false;

-- Adicionar coluna para controlar se a IA deve ignorar análise de grupos
ALTER TABLE whatsapp_ai_agent_config 
ADD COLUMN IF NOT EXISTS ignore_group_analysis boolean DEFAULT true;

-- Comentários para documentação
COMMENT ON COLUMN whatsapp_instances.receive_group_messages IS 'Se true, recebe mensagens de grupos do WhatsApp. Default: false (apenas conversas privadas)';
COMMENT ON COLUMN whatsapp_ai_agent_config.ignore_group_analysis IS 'Se true, a análise de IA não será executada em conversas de grupo mesmo com análise em tempo real ativada. Default: true';