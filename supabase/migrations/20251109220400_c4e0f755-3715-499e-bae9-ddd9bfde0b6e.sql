-- Adicionar novos campos à tabela crm_leads
ALTER TABLE crm_leads 
ADD COLUMN facebook TEXT,
ADD COLUMN instagram TEXT,
ADD COLUMN website TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN utm_source TEXT,
ADD COLUMN utm_media TEXT,
ADD COLUMN utm_campaign TEXT,
ADD COLUMN temperature TEXT CHECK (temperature IN ('cold', 'warm', 'hot')),
ADD COLUMN start_date TIMESTAMPTZ,
ADD COLUMN expected_close_date TIMESTAMPTZ,
ADD COLUMN quantity INTEGER DEFAULT 1,
ADD COLUMN responsible_id UUID REFERENCES crm_users(id),
ADD COLUMN workflow_id TEXT;

-- Índices para performance
CREATE INDEX idx_crm_leads_temperature ON crm_leads(temperature);
CREATE INDEX idx_crm_leads_responsible ON crm_leads(responsible_id);
CREATE INDEX idx_crm_leads_expected_close ON crm_leads(expected_close_date);

-- Tabela de Tags
CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_tag_name_per_workspace UNIQUE(workspace_id, name)
);

-- Tabela de relacionamento Lead-Tags (muitos para muitos)
CREATE TABLE IF NOT EXISTS crm_lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_lead_tag UNIQUE(lead_id, tag_id)
);

-- RLS Policies para tags
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace users can manage tags"
  ON crm_tags FOR ALL
  USING (workspace_id IN (
    SELECT id FROM crm_workspaces WHERE is_active = true
  ));

CREATE POLICY "Workspace users can manage lead tags"
  ON crm_lead_tags FOR ALL
  USING (lead_id IN (
    SELECT id FROM crm_leads WHERE workspace_id IN (
      SELECT id FROM crm_workspaces WHERE is_active = true
    )
  ));

CREATE POLICY "Company members can manage tags"
  ON crm_tags FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM crm_workspaces w
    JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage lead tags"
  ON crm_lead_tags FOR ALL
  USING (lead_id IN (
    SELECT l.id FROM crm_leads l
    JOIN crm_workspaces w ON w.id = l.workspace_id
    JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  ));

-- Índices para tags
CREATE INDEX idx_crm_tags_workspace ON crm_tags(workspace_id);
CREATE INDEX idx_crm_lead_tags_lead ON crm_lead_tags(lead_id);
CREATE INDEX idx_crm_lead_tags_tag ON crm_lead_tags(tag_id);

-- Tabela de Anexos
CREATE TABLE IF NOT EXISTS crm_lead_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES crm_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_private BOOLEAN DEFAULT false
);

-- RLS Policy para anexos
ALTER TABLE crm_lead_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace users can manage attachments"
  ON crm_lead_attachments FOR ALL
  USING (lead_id IN (
    SELECT id FROM crm_leads WHERE workspace_id IN (
      SELECT id FROM crm_workspaces WHERE is_active = true
    )
  ));

CREATE POLICY "Company members can manage attachments"
  ON crm_lead_attachments FOR ALL
  USING (lead_id IN (
    SELECT l.id FROM crm_leads l
    JOIN crm_workspaces w ON w.id = l.workspace_id
    JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  ));

-- Índices para anexos
CREATE INDEX idx_crm_attachments_lead ON crm_lead_attachments(lead_id);
CREATE INDEX idx_crm_attachments_uploaded_by ON crm_lead_attachments(uploaded_by);

-- Criar bucket para anexos de leads
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-lead-attachments', 'crm-lead-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload
CREATE POLICY "Workspace users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'crm-lead-attachments');

-- Policy para download
CREATE POLICY "Workspace users can view attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-lead-attachments');

-- Policy para deletar
CREATE POLICY "Workspace users can delete attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'crm-lead-attachments');