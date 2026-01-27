-- Adicionar colunas para suporte multi-provider na tabela whatsapp_configs
ALTER TABLE whatsapp_configs 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'zapi',
ADD COLUMN IF NOT EXISTS uazapi_endpoint TEXT,
ADD COLUMN IF NOT EXISTS uazapi_token TEXT,
ADD COLUMN IF NOT EXISTS uazapi_session TEXT;

COMMENT ON COLUMN whatsapp_configs.provider IS 'Provider de WhatsApp: zapi ou uazapi';
COMMENT ON COLUMN whatsapp_configs.uazapi_endpoint IS 'URL base da API UazapiGO (ex: https://api.uazapi.com)';
COMMENT ON COLUMN whatsapp_configs.uazapi_token IS 'Token de autenticação da UazapiGO';
COMMENT ON COLUMN whatsapp_configs.uazapi_session IS 'Session ID da instância UazapiGO';

-- Tabela de conversas do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  contact_name TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, phone)
);

-- Tabela de mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  media_url TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  external_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_company ON whatsapp_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);

-- Habilitar RLS
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para whatsapp_conversations
CREATE POLICY "Users can view conversations of their companies"
  ON whatsapp_conversations FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert conversations for their companies"
  ON whatsapp_conversations FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update conversations of their companies"
  ON whatsapp_conversations FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete conversations of their companies"
  ON whatsapp_conversations FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Políticas RLS para whatsapp_messages
CREATE POLICY "Users can view messages of their companies"
  ON whatsapp_messages FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages for their companies"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update messages of their companies"
  ON whatsapp_messages FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete messages of their companies"
  ON whatsapp_messages FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

-- Habilitar Realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;