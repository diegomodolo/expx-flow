-- Adicionar 'deleted' ao enum campaign_status
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'deleted';

-- Adicionar campos para controle de sincronização em campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Adicionar campos para controle de sincronização em ad_sets
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Adicionar campos para controle de sincronização em ads
ALTER TABLE ads ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Criar índices para otimizar queries de sincronização
CREATE INDEX IF NOT EXISTS idx_campaigns_last_synced ON campaigns(client_id, last_synced_at);
CREATE INDEX IF NOT EXISTS idx_ad_sets_last_synced ON ad_sets(client_id, last_synced_at);
CREATE INDEX IF NOT EXISTS idx_ads_last_synced ON ads(client_id, last_synced_at);