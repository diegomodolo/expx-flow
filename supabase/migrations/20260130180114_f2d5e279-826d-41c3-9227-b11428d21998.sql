-- Função que registra automaticamente um touchpoint quando uma mensagem de WhatsApp é enviada
-- para um contato vinculado a um cliente
CREATE OR REPLACE FUNCTION public.auto_register_whatsapp_touchpoint()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_client_contact RECORD;
  v_existing_touchpoint_id UUID;
  v_today_start TIMESTAMPTZ;
BEGIN
  -- Só processar mensagens de saída (enviadas pelo atendente)
  IF NEW.direction != 'outgoing' THEN
    RETURN NEW;
  END IF;
  
  -- Só processar quando status muda para 'sent' (evita duplicatas)
  IF TG_OP = 'UPDATE' AND (OLD.status = 'sent' OR NEW.status != 'sent') THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.status != 'sent' THEN
    RETURN NEW;
  END IF;
  
  -- Buscar a conversa para obter o client_id
  SELECT * INTO v_conversation
  FROM whatsapp_conversations
  WHERE id = NEW.conversation_id;
  
  IF v_conversation IS NULL OR v_conversation.client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Definir início do dia atual
  v_today_start := date_trunc('day', NOW());
  
  -- Verificar se já existe um touchpoint de WhatsApp para este cliente HOJE
  SELECT id INTO v_existing_touchpoint_id
  FROM client_touchpoints
  WHERE client_id = v_conversation.client_id
    AND company_id = v_conversation.company_id
    AND touchpoint_type = 'whatsapp'
    AND occurred_at >= v_today_start
  LIMIT 1;
  
  -- Se já existe touchpoint hoje, não criar outro (agrupar por dia)
  IF v_existing_touchpoint_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Registrar novo touchpoint
  INSERT INTO client_touchpoints (
    client_id,
    company_id,
    touchpoint_type,
    summary,
    occurred_at,
    created_by,
    participants
  ) VALUES (
    v_conversation.client_id,
    v_conversation.company_id,
    'whatsapp',
    'Contato automático via WhatsApp',
    NOW(),
    NEW.sent_by_user_id,
    CASE WHEN NEW.sent_by_user_id IS NOT NULL 
      THEN ARRAY[NEW.sent_by_user_id] 
      ELSE ARRAY[]::UUID[] 
    END
  );
  
  -- Atualizar last_cs_contact_at no health config do cliente
  UPDATE client_health_config
  SET last_cs_contact_at = NOW()
  WHERE client_id = v_conversation.client_id
    AND company_id = v_conversation.company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger na tabela de mensagens
DROP TRIGGER IF EXISTS trigger_auto_register_whatsapp_touchpoint ON whatsapp_messages;

CREATE TRIGGER trigger_auto_register_whatsapp_touchpoint
  AFTER INSERT OR UPDATE OF status ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_register_whatsapp_touchpoint();