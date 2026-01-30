-- Create function to dispatch CS TV alerts when analysis is inserted
CREATE OR REPLACE FUNCTION public.dispatch_cs_tv_alert_on_analysis()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_contact_name TEXT;
  v_contact_phone TEXT;
  v_client_name TEXT;
  v_attendant_id UUID;
  v_attendant_name TEXT;
  v_squad_name TEXT;
  v_last_client_message TEXT;
BEGIN
  -- Only process if score qualifies for alert (< 3 or >= 9)
  IF NEW.score IS NULL OR (NEW.score >= 3 AND NEW.score < 9) THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT 
    wc.id,
    wc.phone,
    wc.contact_name,
    wc.client_id,
    wc.instance_id,
    wc.assigned_user_id,
    c.name as client_name
  INTO v_conversation
  FROM public.whatsapp_conversations wc
  LEFT JOIN public.clients c ON wc.client_id = c.id
  WHERE wc.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_contact_name := COALESCE(v_conversation.contact_name, 'Sem nome');
  v_contact_phone := COALESCE(v_conversation.phone, '');
  v_client_name := v_conversation.client_name;
  
  -- Get attendant info from whatsapp_instance_users or assigned_user_id
  IF v_conversation.assigned_user_id IS NOT NULL THEN
    v_attendant_id := v_conversation.assigned_user_id;
  ELSE
    -- Fallback: get official attendant from instance
    SELECT wiu.user_id INTO v_attendant_id
    FROM public.whatsapp_instance_users wiu
    WHERE wiu.instance_id = v_conversation.instance_id
      AND wiu.is_attendant = true
    LIMIT 1;
  END IF;

  -- Get attendant name
  IF v_attendant_id IS NOT NULL THEN
    SELECT COALESCE(e.name, p.full_name, 'Sem nome') INTO v_attendant_name
    FROM public.profiles p
    LEFT JOIN public.employees e ON e.user_id = p.user_id AND e.company_id = NEW.company_id
    WHERE p.user_id = v_attendant_id;
  END IF;

  -- For celebrations, try to get last client message
  IF NEW.score >= 9 THEN
    SELECT content INTO v_last_client_message
    FROM public.whatsapp_messages
    WHERE conversation_id = NEW.conversation_id
      AND direction = 'inbound'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Insert alert event
  INSERT INTO public.cs_tv_realtime_alert_events (
    company_id,
    alert_type,
    alert_data
  ) VALUES (
    NEW.company_id,
    CASE WHEN NEW.score < 3 THEN 'critical' ELSE 'celebration' END,
    jsonb_build_object(
      'analysisId', NEW.id,
      'conversationId', NEW.conversation_id,
      'score', NEW.score,
      'temperature', NEW.temperature,
      'interpretation', NEW.interpretation,
      'suggestion', NEW.suggestion,
      'contactName', v_contact_name,
      'contactPhone', v_contact_phone,
      'clientName', v_client_name,
      'attendantId', v_attendant_id,
      'attendantName', v_attendant_name,
      'squadName', v_squad_name,
      'lastClientMessage', v_last_client_message,
      'timestamp', NEW.analyzed_at
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the original insert
  RAISE WARNING 'Error dispatching CS TV alert: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on whatsapp_realtime_analysis_history
DROP TRIGGER IF EXISTS trigger_dispatch_cs_tv_alert ON public.whatsapp_realtime_analysis_history;

CREATE TRIGGER trigger_dispatch_cs_tv_alert
  AFTER INSERT ON public.whatsapp_realtime_analysis_history
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_cs_tv_alert_on_analysis();