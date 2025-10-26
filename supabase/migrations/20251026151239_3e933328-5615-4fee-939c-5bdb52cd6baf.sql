-- Adicionar campo client_id à tabela ia_agents
ALTER TABLE ia_agents ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Criar tabela para armazenar documentos de conhecimento
CREATE TABLE ia_agent_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ia_agents(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  content_text text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_knowledge_docs_agent ON ia_agent_knowledge_documents(agent_id);
CREATE INDEX idx_knowledge_docs_company ON ia_agent_knowledge_documents(company_id);

-- RLS policies para ia_agent_knowledge_documents
ALTER TABLE ia_agent_knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da empresa podem criar documentos"
ON ia_agent_knowledge_documents FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Membros da empresa podem ver documentos"
ON ia_agent_knowledge_documents FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Membros da empresa podem deletar documentos"
ON ia_agent_knowledge_documents FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_knowledge_docs_updated_at
  BEFORE UPDATE ON ia_agent_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar bucket para documentos de conhecimento dos agentes
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-knowledge', 'agent-knowledge', false);

-- RLS policies para o bucket
CREATE POLICY "Usuários podem fazer upload de documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-knowledge');

CREATE POLICY "Usuários podem ver seus documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agent-knowledge');

CREATE POLICY "Usuários podem deletar seus documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-knowledge');