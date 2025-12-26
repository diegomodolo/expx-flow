-- =============================================
-- CRM Restructure: Separar Lead de Negócio (Deal)
-- =============================================

-- 1. Criar tabela de CONTATOS (os leads/clientes)
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm_workspaces(id) ON DELETE CASCADE,
  
  -- Dados de identificação
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  
  -- Redes sociais e web
  facebook TEXT,
  instagram TEXT,
  website TEXT,
  
  -- Localização
  city TEXT,
  state TEXT,
  country TEXT,
  
  -- Rastreamento/Origem
  external_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Metadados
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint para evitar duplicatas no mesmo workspace
  CONSTRAINT crm_contacts_workspace_external_id_unique UNIQUE (workspace_id, external_id)
);

-- 2. Criar tabela de NEGÓCIOS (deals/oportunidades)
CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm_workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES crm_stages(id) ON DELETE RESTRICT,
  
  -- Dados do negócio
  title TEXT NOT NULL,
  value NUMERIC,
  quantity INTEGER DEFAULT 1,
  
  -- Status e temperatura
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  temperature TEXT CHECK (temperature IN ('cold', 'warm', 'hot')),
  
  -- Datas
  start_date TIMESTAMPTZ DEFAULT NOW(),
  expected_close_date TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Responsabilidade
  responsible_id UUID REFERENCES auth.users(id),
  
  -- Notas e desqualificação
  notes TEXT,
  disqualification_reason TEXT,
  
  -- Workflow e links
  workflow_id TEXT,
  source_deal_id UUID REFERENCES crm_deals(id),
  
  -- Arquivamento
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  
  -- Metadados
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Criar tabela de ATIVIDADES do negócio
CREATE TABLE public.crm_deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  
  -- Tipo e descrição
  activity_type TEXT NOT NULL,
  notes TEXT,
  
  -- Stages para mudanças
  from_stage_id UUID REFERENCES crm_stages(id),
  to_stage_id UUID REFERENCES crm_stages(id),
  
  -- Valores antigos/novos para logs de mudança
  old_value TEXT,
  new_value TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Criar tabela de LINKS entre negócios (para workflow)
CREATE TABLE public.crm_deal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  target_deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'workflow',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT crm_deal_links_unique UNIQUE (source_deal_id, target_deal_id)
);

-- 5. Índices para performance
CREATE INDEX idx_crm_contacts_workspace ON crm_contacts(workspace_id);
CREATE INDEX idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX idx_crm_contacts_phone ON crm_contacts(phone);
CREATE INDEX idx_crm_contacts_external_id ON crm_contacts(external_id);

CREATE INDEX idx_crm_deals_workspace ON crm_deals(workspace_id);
CREATE INDEX idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage_id);
CREATE INDEX idx_crm_deals_status ON crm_deals(status);
CREATE INDEX idx_crm_deals_archived ON crm_deals(is_archived);

CREATE INDEX idx_crm_deal_activities_deal ON crm_deal_activities(deal_id);
CREATE INDEX idx_crm_deal_activities_contact ON crm_deal_activities(contact_id);

-- 6. Triggers para updated_at
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Habilitar RLS
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_links ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS para crm_contacts
CREATE POLICY "Users can view contacts in their workspace"
  ON crm_contacts FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create contacts in their workspace"
  ON crm_contacts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update contacts in their workspace"
  ON crm_contacts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete contacts in their workspace"
  ON crm_contacts FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

-- 9. Políticas RLS para crm_deals
CREATE POLICY "Users can view deals in their workspace"
  ON crm_deals FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create deals in their workspace"
  ON crm_deals FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update deals in their workspace"
  ON crm_deals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete deals in their workspace"
  ON crm_deals FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM crm_workspaces 
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

-- 10. Políticas RLS para crm_deal_activities
CREATE POLICY "Users can view deal activities in their workspace"
  ON crm_deal_activities FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM crm_deals WHERE workspace_id IN (
        SELECT id FROM crm_workspaces 
        WHERE company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create deal activities in their workspace"
  ON crm_deal_activities FOR INSERT
  WITH CHECK (
    deal_id IN (
      SELECT id FROM crm_deals WHERE workspace_id IN (
        SELECT id FROM crm_workspaces 
        WHERE company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- 11. Políticas RLS para crm_deal_links
CREATE POLICY "Users can view deal links in their workspace"
  ON crm_deal_links FOR SELECT
  USING (
    source_deal_id IN (
      SELECT id FROM crm_deals WHERE workspace_id IN (
        SELECT id FROM crm_workspaces 
        WHERE company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create deal links in their workspace"
  ON crm_deal_links FOR INSERT
  WITH CHECK (
    source_deal_id IN (
      SELECT id FROM crm_deals WHERE workspace_id IN (
        SELECT id FROM crm_workspaces 
        WHERE company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete deal links in their workspace"
  ON crm_deal_links FOR DELETE
  USING (
    source_deal_id IN (
      SELECT id FROM crm_deals WHERE workspace_id IN (
        SELECT id FROM crm_workspaces 
        WHERE company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- 12. MIGRAÇÃO DE DADOS EXISTENTES
-- Primeiro, criar contatos a partir dos leads existentes
INSERT INTO crm_contacts (
  id,
  workspace_id,
  full_name,
  email,
  phone,
  company_name,
  facebook,
  instagram,
  website,
  city,
  state,
  external_id,
  utm_source,
  utm_medium,
  utm_campaign,
  notes,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  l.workspace_id,
  l.full_name,
  l.email,
  l.phone,
  l.company_name,
  l.facebook,
  l.instagram,
  l.website,
  l.city,
  l.state,
  l.external_id,
  l.utm_source,
  l.utm_media,
  l.utm_campaign,
  l.notes,
  l.created_at,
  l.updated_at
FROM crm_leads l
WHERE l.external_id IS NOT NULL
ON CONFLICT (workspace_id, external_id) DO NOTHING;

-- Criar contatos para leads sem external_id (usar id do lead como external_id)
INSERT INTO crm_contacts (
  workspace_id,
  full_name,
  email,
  phone,
  company_name,
  facebook,
  instagram,
  website,
  city,
  state,
  external_id,
  utm_source,
  utm_medium,
  utm_campaign,
  notes,
  created_at,
  updated_at
)
SELECT 
  l.workspace_id,
  l.full_name,
  l.email,
  l.phone,
  l.company_name,
  l.facebook,
  l.instagram,
  l.website,
  l.city,
  l.state,
  l.id::TEXT as external_id,
  l.utm_source,
  l.utm_media,
  l.utm_campaign,
  l.notes,
  l.created_at,
  l.updated_at
FROM crm_leads l
WHERE l.external_id IS NULL
ON CONFLICT (workspace_id, external_id) DO NOTHING;

-- Depois, criar deals a partir dos leads existentes
INSERT INTO crm_deals (
  workspace_id,
  contact_id,
  stage_id,
  title,
  value,
  quantity,
  status,
  temperature,
  start_date,
  expected_close_date,
  responsible_id,
  notes,
  disqualification_reason,
  workflow_id,
  is_archived,
  created_at,
  updated_at
)
SELECT 
  l.workspace_id,
  c.id as contact_id,
  l.stage_id,
  COALESCE(l.full_name, 'Negócio') as title,
  l.value,
  l.quantity,
  CASE 
    WHEN l.status = 'ganho' THEN 'won'
    WHEN l.status = 'perdido' THEN 'lost'
    ELSE 'open'
  END as status,
  l.temperature,
  l.start_date,
  l.expected_close_date,
  l.responsible_id,
  l.notes,
  l.disqualification_reason,
  l.workflow_id,
  COALESCE(l.is_archived, false),
  l.created_at,
  l.updated_at
FROM crm_leads l
JOIN crm_contacts c ON c.workspace_id = l.workspace_id 
  AND c.external_id = COALESCE(l.external_id, l.id::TEXT);

-- 13. Migrar atividades existentes para a nova tabela
INSERT INTO crm_deal_activities (
  deal_id,
  activity_type,
  notes,
  from_stage_id,
  to_stage_id,
  is_manual,
  created_at,
  created_by
)
SELECT 
  d.id as deal_id,
  a.activity_type,
  a.notes,
  a.from_stage_id,
  a.to_stage_id,
  COALESCE(a.is_manual, false),
  a.created_at,
  a.created_by
FROM crm_lead_activities a
JOIN crm_leads l ON l.id = a.lead_id
JOIN crm_contacts c ON c.workspace_id = l.workspace_id 
  AND c.external_id = COALESCE(l.external_id, l.id::TEXT)
JOIN crm_deals d ON d.contact_id = c.id AND d.workspace_id = l.workspace_id;