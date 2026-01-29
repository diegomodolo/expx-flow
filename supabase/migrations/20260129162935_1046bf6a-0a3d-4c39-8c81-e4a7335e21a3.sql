-- Trigger function to update last_cs_contact_at when WhatsApp messages are sent/received for linked clients
CREATE OR REPLACE FUNCTION public.update_last_cs_contact_from_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_company_id UUID;
BEGIN
  -- Get the client_id and company_id from the conversation
  SELECT client_id, company_id INTO v_client_id, v_company_id
  FROM public.whatsapp_conversations
  WHERE id = NEW.conversation_id;
  
  -- Only update if conversation is linked to a client
  IF v_client_id IS NOT NULL AND v_company_id IS NOT NULL THEN
    -- Upsert client_health_config with updated last_cs_contact_at
    INSERT INTO public.client_health_config (client_id, company_id, last_cs_contact_at, updated_at)
    VALUES (v_client_id, v_company_id, NOW(), NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      last_cs_contact_at = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on whatsapp_messages to update contact timestamp
DROP TRIGGER IF EXISTS trigger_update_last_cs_contact_whatsapp ON public.whatsapp_messages;
CREATE TRIGGER trigger_update_last_cs_contact_whatsapp
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_cs_contact_from_whatsapp();

-- Also update last_cs_contact_at when a conversation is linked to a client
CREATE OR REPLACE FUNCTION public.update_last_cs_contact_on_client_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when client_id is being set (was null or changed)
  IF NEW.client_id IS NOT NULL AND (OLD.client_id IS NULL OR OLD.client_id != NEW.client_id) THEN
    -- Upsert client_health_config with updated last_cs_contact_at
    INSERT INTO public.client_health_config (client_id, company_id, last_cs_contact_at, updated_at)
    VALUES (NEW.client_id, NEW.company_id, NOW(), NOW())
    ON CONFLICT (client_id) 
    DO UPDATE SET 
      last_cs_contact_at = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_last_cs_contact_on_link ON public.whatsapp_conversations;
CREATE TRIGGER trigger_update_last_cs_contact_on_link
  AFTER UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_cs_contact_on_client_link();

COMMENT ON FUNCTION public.update_last_cs_contact_from_whatsapp() IS 
'Automatically updates last_cs_contact_at in client_health_config when WhatsApp messages are exchanged with linked clients';

COMMENT ON FUNCTION public.update_last_cs_contact_on_client_link() IS 
'Automatically updates last_cs_contact_at in client_health_config when a WhatsApp conversation is linked to a client';