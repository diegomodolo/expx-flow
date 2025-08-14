-- Atualizar política RLS para que usuários vejam apenas suas próprias conversas
DROP POLICY IF EXISTS "Company members can view conversations" ON ai_chat_conversations;

CREATE POLICY "Users can view their own conversations" 
ON ai_chat_conversations 
FOR SELECT 
USING (user_id = auth.uid());