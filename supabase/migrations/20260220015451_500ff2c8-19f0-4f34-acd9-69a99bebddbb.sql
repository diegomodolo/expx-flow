
-- Fase 4: Trigger para notificar aprovadores quando anúncio entra na fila com status 'pending'

CREATE OR REPLACE FUNCTION public.notify_pending_ad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;

  v_headline TEXT;

  v_member RECORD;

BEGIN
  -- Only act on INSERT or UPDATE where status becomes 'pending'
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending') THEN

    -- Get client name
    SELECT name INTO v_client_name
    FROM public.clients
    WHERE id = NEW.client_id;


    -- Extract headline from generated_content JSONB
    v_headline := COALESCE(
      NEW.generated_content->>'headline',
      NEW.generated_content->'ad'->>'headline',
      'Anúncio sem título'
    );


    -- Notify all company members
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
        '/geradores/fila-revisao',
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

$$;


-- Create trigger on ad_generation_queue
DROP TRIGGER IF EXISTS trigger_notify_pending_ad ON public.ad_generation_queue;
DROP TRIGGER IF EXISTS trigger_notify_pending_ad ON public.ad_generation_queue;
CREATE TRIGGER trigger_notify_pending_ad
  AFTER INSERT OR UPDATE OF status
  ON public.ad_generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pending_ad();



-- Fase 6a: Trigger para notificar autorizador quando tarefa vai para review
CREATE OR REPLACE FUNCTION public.notify_task_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorizer RECORD;

  v_auth_user_id UUID;

BEGIN
  -- Only act when status changes to 'review'
  IF NEW.status = 'review' AND (OLD.status IS NULL OR OLD.status != 'review') THEN

    -- Find authorizers for this task via task_members
    FOR v_authorizer IN
      SELECT tm.employee_id
      FROM public.task_members tm
      WHERE tm.task_id = NEW.id
        AND tm.role = 'authorizer'
    LOOP
      -- Get user_id from employee record
      SELECT user_id INTO v_auth_user_id
      FROM public.employees
      WHERE id = v_authorizer.employee_id
        AND company_id = NEW.company_id;


      IF v_auth_user_id IS NOT NULL THEN
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
          v_auth_user_id,
          'task_review',
          'Tarefa aguardando sua revisão',
          COALESCE(NEW.title, 'Tarefa sem título') || ' — enviada por ' || COALESCE(NEW.responsible_name, ''),
          'high',
          '/squad-command-center',
          jsonb_build_object(
            'task_id', NEW.id,
            'task_title', NEW.title
          ),
          'task',
          NEW.id::TEXT
        );

      END IF;

    END LOOP;


  END IF;


  RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS trigger_notify_task_review ON public.tasks;
DROP TRIGGER IF EXISTS trigger_notify_task_review ON public.tasks;
CREATE TRIGGER trigger_notify_task_review
  AFTER UPDATE OF status
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_review();



-- Fase 6b: Trigger para notificar responsável quando tarefa é atribuída
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when assigned_user_id is set/changed and is not null
  IF NEW.assigned_user_id IS NOT NULL AND 
     (OLD.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id) THEN

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
      NEW.assigned_user_id,
      'task_assigned',
      'Nova tarefa atribuída a você',
      COALESCE(NEW.title, 'Tarefa sem título'),
      'normal',
      '/tarefas',
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', NEW.title
      ),
      'task',
      NEW.id::TEXT
    );


  END IF;


  RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON public.tasks;
CREATE TRIGGER trigger_notify_task_assigned
  AFTER INSERT OR UPDATE OF assigned_user_id
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();
