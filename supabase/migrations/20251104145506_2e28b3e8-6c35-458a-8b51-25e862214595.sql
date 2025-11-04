-- Tabela para armazenar conversões offline enviadas ao Meta
CREATE TABLE offline_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  offline_event_set_id TEXT NOT NULL,
  
  -- Dados do evento
  event_name TEXT NOT NULL DEFAULT 'Purchase',
  event_time BIGINT NOT NULL,
  value DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  
  -- Dados do usuário (já hasheados)
  user_email_hash TEXT,
  user_phone_hash TEXT,
  user_first_name_hash TEXT,
  user_last_name_hash TEXT,
  user_city_hash TEXT,
  user_state_hash TEXT,
  user_zip_hash TEXT,
  user_country_hash TEXT DEFAULT 'br',
  
  -- Dados customizados
  custom_data JSONB,
  
  -- Status e tracking
  status TEXT NOT NULL DEFAULT 'pending',
  meta_response JSONB,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT offline_conversions_status_check CHECK (status IN ('pending', 'sent', 'error'))
);

-- Adicionar coluna para armazenar o Offline Event Set ID na tabela clients
ALTER TABLE clients 
ADD COLUMN offline_event_set_id TEXT;

COMMENT ON COLUMN clients.offline_event_set_id IS 'ID do conjunto de eventos offline configurado no Meta Events Manager';

-- Índices para performance
CREATE INDEX idx_offline_conversions_client ON offline_conversions(client_id);
CREATE INDEX idx_offline_conversions_status ON offline_conversions(status);
CREATE INDEX idx_offline_conversions_created ON offline_conversions(created_at DESC);

-- RLS Policies
ALTER TABLE offline_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's offline conversions"
  ON offline_conversions FOR SELECT
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      INNER JOIN company_members cm ON cm.company_id = c.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert offline conversions for their company"
  ON offline_conversions FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT c.id FROM clients c
      INNER JOIN company_members cm ON cm.company_id = c.company_id
      WHERE cm.user_id = auth.uid()
    )
  );