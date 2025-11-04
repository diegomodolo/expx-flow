-- Adicionar coluna source na tabela offline_conversions
ALTER TABLE offline_conversions 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' 
  CHECK (source IN ('manual', 'webhook', 'api'));

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_offline_conversions_source ON offline_conversions(source);

-- Tabela para armazenar tokens de webhook por cliente
CREATE TABLE IF NOT EXISTS offline_conversion_webhook_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_webhook_tokens_client ON offline_conversion_webhook_tokens(client_id);
CREATE INDEX idx_webhook_tokens_token ON offline_conversion_webhook_tokens(token) WHERE is_active = true;
CREATE INDEX idx_webhook_tokens_active ON offline_conversion_webhook_tokens(is_active);

-- RLS Policies
ALTER TABLE offline_conversion_webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view webhook tokens"
  ON offline_conversion_webhook_tokens FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Company members can create webhook tokens"
  ON offline_conversion_webhook_tokens FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Company members can update webhook tokens"
  ON offline_conversion_webhook_tokens FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Company members can delete webhook tokens"
  ON offline_conversion_webhook_tokens FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_webhook_tokens_updated_at
  BEFORE UPDATE ON offline_conversion_webhook_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();