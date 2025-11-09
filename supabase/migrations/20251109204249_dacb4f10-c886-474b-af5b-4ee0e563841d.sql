-- ============================================
-- MINI CRM - Conversões Offline Automáticas
-- ============================================

-- 1. Tabela de Workspaces do CRM
CREATE TABLE IF NOT EXISTS crm_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  access_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_workspace_per_client UNIQUE(client_id)
);

-- RLS para crm_workspaces
ALTER TABLE crm_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage CRM workspaces"
  ON crm_workspaces FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public access via valid token"
  ON crm_workspaces FOR SELECT
  USING (is_active = true);

-- Índice para busca por token
CREATE INDEX idx_crm_workspaces_token ON crm_workspaces(access_token);
CREATE INDEX idx_crm_workspaces_client ON crm_workspaces(client_id);

-- 2. Tabela de Usuários do CRM (clientes externos)
CREATE TABLE IF NOT EXISTS crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm_workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_email_per_workspace UNIQUE(workspace_id, email)
);

-- RLS para crm_users
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace users can view CRM users"
  ON crm_users FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM crm_workspaces WHERE is_active = true
  ));

CREATE POLICY "Company members can manage CRM users"
  ON crm_users FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM crm_workspaces w
    INNER JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  ));

-- 3. Tabela de Estágios/Colunas do Kanban
CREATE TABLE IF NOT EXISTS crm_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_mapping TEXT,
  order_index INT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_stage_order UNIQUE(workspace_id, order_index)
);

-- RLS para crm_stages
ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace users can view stages"
  ON crm_stages FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM crm_workspaces WHERE is_active = true
  ));

CREATE POLICY "Company members can manage stages"
  ON crm_stages FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM crm_workspaces w
    INNER JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  ));

-- Índice para ordenação
CREATE INDEX idx_crm_stages_workspace_order ON crm_stages(workspace_id, order_index);

-- 4. Tabela de Leads do CRM
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm_workspaces(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES crm_stages(id) ON DELETE RESTRICT,
  
  -- Dados do Lead
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  
  -- Campos adicionais
  notes TEXT,
  value NUMERIC,
  disqualification_reason TEXT,
  
  -- Metadados
  created_by UUID REFERENCES crm_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Para rastreamento no Meta (leadId)
  external_id TEXT,
  
  CONSTRAINT require_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- RLS para crm_leads
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace users can manage leads"
  ON crm_leads FOR ALL
  USING (workspace_id IN (
    SELECT id FROM crm_workspaces WHERE is_active = true
  ));

-- Índices para performance
CREATE INDEX idx_crm_leads_workspace ON crm_leads(workspace_id, stage_id);
CREATE INDEX idx_crm_leads_external_id ON crm_leads(external_id);
CREATE INDEX idx_crm_leads_created_at ON crm_leads(created_at DESC);

-- 5. Tabela de Atividades/Histórico
CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  from_stage_id UUID REFERENCES crm_stages(id),
  to_stage_id UUID REFERENCES crm_stages(id),
  notes TEXT,
  created_by UUID REFERENCES crm_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Referência ao evento enviado ao Meta
  conversion_id UUID REFERENCES offline_conversions(id),
  event_sent BOOLEAN DEFAULT false
);

-- RLS para crm_lead_activities
ALTER TABLE crm_lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace users can view activities"
  ON crm_lead_activities FOR SELECT
  USING (lead_id IN (
    SELECT id FROM crm_leads 
    WHERE workspace_id IN (
      SELECT id FROM crm_workspaces WHERE is_active = true
    )
  ));

CREATE POLICY "Company members can view all activities"
  ON crm_lead_activities FOR SELECT
  USING (lead_id IN (
    SELECT l.id FROM crm_leads l
    INNER JOIN crm_workspaces w ON w.id = l.workspace_id
    INNER JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  ));

-- Índice para histórico
CREATE INDEX idx_crm_activities_lead ON crm_lead_activities(lead_id, created_at DESC);

-- Função para gerar token único
CREATE OR REPLACE FUNCTION generate_crm_access_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(16), 'hex');
    
    SELECT EXISTS(
      SELECT 1 FROM crm_workspaces WHERE access_token = new_token
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at em crm_leads
CREATE OR REPLACE FUNCTION update_crm_lead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_lead_updated_at();