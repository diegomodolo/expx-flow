-- 1. Adicionar responsavel WhatsApp nos squads
ALTER TABLE teams
ADD COLUMN whatsapp_responsible_id UUID REFERENCES employees(id);

-- 2. Tabela de atribuicoes de conversas
CREATE TABLE whatsapp_conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_type TEXT NOT NULL CHECK (assigned_type IN ('individual', 'squad')),
  assigned_to_user_id UUID REFERENCES auth.users(id),
  assigned_to_team_id UUID REFERENCES teams(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

-- 3. Historico para auditoria e relatorios
CREATE TABLE whatsapp_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id),
  from_team_id UUID REFERENCES teams(id),
  to_user_id UUID REFERENCES auth.users(id),
  to_team_id UUID REFERENCES teams(id),
  action TEXT NOT NULL CHECK (action IN ('assigned', 'transferred', 'closed', 'reopened')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Rastrear quem enviou cada mensagem
ALTER TABLE whatsapp_messages
ADD COLUMN sent_by_user_id UUID REFERENCES auth.users(id);

-- 5. Indices para performance
CREATE INDEX idx_assignments_conversation ON whatsapp_conversation_assignments(conversation_id);
CREATE INDEX idx_assignments_user ON whatsapp_conversation_assignments(assigned_to_user_id, status);
CREATE INDEX idx_assignments_team ON whatsapp_conversation_assignments(assigned_to_team_id, status);
CREATE INDEX idx_assignments_company ON whatsapp_conversation_assignments(company_id, status);
CREATE INDEX idx_assignment_history_conv ON whatsapp_assignment_history(conversation_id);
CREATE INDEX idx_messages_sent_by ON whatsapp_messages(sent_by_user_id);

-- 6. Enable RLS
ALTER TABLE whatsapp_conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_assignment_history ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies para whatsapp_conversation_assignments
CREATE POLICY "Users can view assignments from their company"
ON whatsapp_conversation_assignments
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create assignments in their company"
ON whatsapp_conversation_assignments
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update assignments in their company"
ON whatsapp_conversation_assignments
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete assignments in their company"
ON whatsapp_conversation_assignments
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- 8. RLS Policies para whatsapp_assignment_history
CREATE POLICY "Users can view assignment history from their company"
ON whatsapp_assignment_history
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create assignment history in their company"
ON whatsapp_assignment_history
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- 9. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_assignment_updated_at
BEFORE UPDATE ON whatsapp_conversation_assignments
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_assignment_updated_at();