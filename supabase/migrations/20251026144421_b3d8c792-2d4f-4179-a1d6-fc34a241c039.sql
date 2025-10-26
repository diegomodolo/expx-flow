-- Criar tabela de agentes de IA
CREATE TABLE ia_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,
  description TEXT,
  prompt_base TEXT NOT NULL,
  additional_instructions TEXT,
  model VARCHAR(50) DEFAULT 'google/gemini-2.5-flash',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT prompt_base_min_length CHECK (length(prompt_base) >= 50)
);

CREATE INDEX idx_ia_agents_company ON ia_agents(company_id);
CREATE INDEX idx_ia_agents_user ON ia_agents(user_id);

-- Criar tabela de conversas
CREATE TABLE ia_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ia_agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ia_agent_convs_agent ON ia_agent_conversations(agent_id);
CREATE INDEX idx_ia_agent_convs_company ON ia_agent_conversations(company_id);

-- Criar tabela de mensagens
CREATE TABLE ia_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ia_agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ia_agent_msgs_conversation ON ia_agent_messages(conversation_id);
CREATE INDEX idx_ia_agent_msgs_created ON ia_agent_messages(created_at);

-- RLS Policies para ia_agents
ALTER TABLE ia_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agents from their company"
  ON ia_agents FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create agents in their company"
  ON ia_agents FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ) AND user_id = auth.uid());

CREATE POLICY "Users can update their own agents"
  ON ia_agents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own agents"
  ON ia_agents FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies para ia_agent_conversations
ALTER TABLE ia_agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations from their company"
  ON ia_agent_conversations FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create conversations"
  ON ia_agent_conversations FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ) AND user_id = auth.uid());

CREATE POLICY "Users can update their conversations"
  ON ia_agent_conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their conversations"
  ON ia_agent_conversations FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies para ia_agent_messages
ALTER TABLE ia_agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their conversations"
  ON ia_agent_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM ia_agent_conversations 
    WHERE company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create messages"
  ON ia_agent_messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM ia_agent_conversations 
    WHERE user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ia_agents_updated_at
  BEFORE UPDATE ON ia_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ia_agent_conversations_updated_at
  BEFORE UPDATE ON ia_agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();