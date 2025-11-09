-- Adicionar coluna para armazenar o payload original do webhook
ALTER TABLE offline_conversions 
ADD COLUMN IF NOT EXISTS webhook_payload JSONB;

COMMENT ON COLUMN offline_conversions.webhook_payload IS 'Payload original recebido no webhook antes do processamento';

-- Índice GIN para permitir buscas eficientes no JSONB
CREATE INDEX IF NOT EXISTS idx_offline_conversions_webhook_payload 
ON offline_conversions USING gin(webhook_payload);