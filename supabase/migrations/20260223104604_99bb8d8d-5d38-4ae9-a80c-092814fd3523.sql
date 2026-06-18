-- Fix the notify_pending_ad function to use the correct route
CREATE OR REPLACE FUNCTION public.notify_pending_ad()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;

  v_headline TEXT;

  v_member RECORD;

BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending') THEN

    SELECT name INTO v_client_name
    FROM public.clients
    WHERE id = NEW.client_id;


    v_headline := COALESCE(
      NEW.generated_content->>'headline',
      NEW.generated_content->'ad'->>'headline',
      'Anúncio sem título'
    );


    FOR v_member IN
      SELECT user_id FROM public.company_members
      WHERE company_id = NEW.company_id
    LOOP
      INSERT INTO public.user_notifications (
        company_id,
        user_id,
        type,
        title,
        body,
        priority,
        action_url,
        action_metadata,
        source_type,
        source_id
      ) VALUES (
        NEW.company_id,
        v_member.user_id,
        'ad_pending_approval',
        'Anúncio aguardando revisão — ' || COALESCE(v_client_name, 'Cliente'),
        'Tipo: ' || NEW.generation_type || '. ' || v_headline,
        'normal',
        '/geradores/fabrica-anuncios/revisao-diaria',
        jsonb_build_object(
          'ad_id', NEW.id,
          'client_id', NEW.client_id,
          'generation_type', NEW.generation_type
        ),
        'ad_queue',
        NEW.id::TEXT
      );

    END LOOP;


  END IF;


  RETURN NEW;

END;

$function$;


-- Update existing notifications with wrong URL
UPDATE public.user_notifications 
SET action_url = '/geradores/fabrica-anuncios/revisao-diaria' 
WHERE action_url = '/geradores/fila-revisao';