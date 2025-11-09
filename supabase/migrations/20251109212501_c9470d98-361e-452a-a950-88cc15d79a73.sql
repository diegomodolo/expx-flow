-- Criar tabela de metas para workspaces CRM
CREATE TABLE crm_workspace_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm_workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  target_leads INTEGER,
  target_revenue DECIMAL(10,2),
  target_conversion_rate DECIMAL(5,2),
  target_closed_deals INTEGER,
  
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(workspace_id, month, year)
);

-- Habilitar RLS
ALTER TABLE crm_workspace_goals ENABLE ROW LEVEL SECURITY;

-- Company members podem visualizar metas
CREATE POLICY "Company members can view workspace goals"
  ON crm_workspace_goals FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM crm_workspaces w
      JOIN company_members cm ON cm.company_id = w.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Company members podem criar metas
CREATE POLICY "Company members can create workspace goals"
  ON crm_workspace_goals FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM crm_workspaces w
      JOIN company_members cm ON cm.company_id = w.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Company members podem atualizar metas
CREATE POLICY "Company members can update workspace goals"
  ON crm_workspace_goals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT w.id FROM crm_workspaces w
      JOIN company_members cm ON cm.company_id = w.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Company members podem deletar metas
CREATE POLICY "Company members can delete workspace goals"
  ON crm_workspace_goals FOR DELETE
  USING (
    workspace_id IN (
      SELECT w.id FROM crm_workspaces w
      JOIN company_members cm ON cm.company_id = w.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Index para melhorar performance de queries
CREATE INDEX idx_crm_workspace_goals_workspace_id ON crm_workspace_goals(workspace_id);
CREATE INDEX idx_crm_workspace_goals_company_id ON crm_workspace_goals(company_id);
CREATE INDEX idx_crm_workspace_goals_month_year ON crm_workspace_goals(month, year);