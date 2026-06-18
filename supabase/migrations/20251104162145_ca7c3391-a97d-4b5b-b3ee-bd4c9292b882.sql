-- Adicionar coluna source na tabela offline_conversions
ALTER TABLE offline_conversions 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' 
  CHECK (source IN ('manual', 'webhook', 'api'));


-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_offline_conversions_source ON offline_conversions(source);

-- Self-host: pgcrypto no Supabase novo não expõe gen_random_bytes; usar gen_random_uuid().
-- Tabela para armazenar tokens de webhook por cliente
CREATE TABLE IF NOT EXISTS offline_conversion_webhook_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT md5(gen_random_uuid()::text || random()::text),
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_tokens_client ON offline_conversion_webhook_tokens(client_id);;

CREATE INDEX IF NOT EXISTS idx_webhook_tokens_token ON offline_conversion_webhook_tokens(token) WHERE is_active = true;;

CREATE INDEX IF NOT EXISTS idx_webhook_tokens_active ON offline_conversion_webhook_tokens(is_active);;



-- RLS Policies
ALTER TABLE offline_conversion_webhook_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Company members can view webhook tokens"
  ON offline_conversion_webhook_tokens FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can create webhook tokens"
  ON offline_conversion_webhook_tokens FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can update webhook tokens"
  ON offline_conversion_webhook_tokens FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company members can delete webhook tokens"
  ON offline_conversion_webhook_tokens FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DROP TRIGGER IF EXISTS update_webhook_tokens_updated_at ON offline_conversion_webhook_tokens;
CREATE TRIGGER update_webhook_tokens_updated_at
  BEFORE UPDATE ON offline_conversion_webhook_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
