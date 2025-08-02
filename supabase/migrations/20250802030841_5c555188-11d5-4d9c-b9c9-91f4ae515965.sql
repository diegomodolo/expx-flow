-- Fix create_task_from_alert function to handle team_id properly
CREATE OR REPLACE FUNCTION public.create_task_from_alert(_company_id uuid, _alert_type text, _alert_description text, _related_campaign_id uuid DEFAULT NULL::uuid, _related_client_id uuid DEFAULT NULL::uuid, _alert_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _task_id uuid;
  _title text;
  _priority task_priority;
  _due_date timestamp with time zone;
  _team_id uuid;
  _responsible_user_id uuid;
BEGIN
  -- Determinar título baseado no tipo de alerta
  CASE _alert_type
    WHEN 'high_cpa' THEN 
      _title := 'Otimizar CPA Alto';
      _priority := 'high';
    WHEN 'low_performance' THEN 
      _title := 'Revisar Performance Baixa';
      _priority := 'high';
    WHEN 'budget_exceeded' THEN 
      _title := 'Budget Excedido - Ação Necessária';
      _priority := 'high';
    WHEN 'scale_opportunity' THEN 
      _title := 'Oportunidade de Escalar Campanha';
      _priority := 'medium';
    ELSE 
      _title := 'Ação Necessária';
      _priority := 'medium';
  END CASE;

  -- Definir prazo baseado na prioridade
  _due_date := CASE _priority
    WHEN 'high' THEN now() + interval '1 day'
    WHEN 'medium' THEN now() + interval '3 days'
    ELSE now() + interval '7 days'
  END;

  -- Buscar equipe responsável (primeira equipe da empresa)
  SELECT id INTO _team_id 
  FROM teams 
  WHERE company_id = _company_id 
  LIMIT 1;

  -- Se não encontrar equipe, criar uma equipe padrão
  IF _team_id IS NULL THEN
    -- Buscar responsável (primeiro membro da empresa)
    SELECT user_id INTO _responsible_user_id
    FROM company_members
    WHERE company_id = _company_id
      AND role IN ('owner', 'admin')
    LIMIT 1;
    
    -- Se não encontrar responsável, buscar qualquer membro
    IF _responsible_user_id IS NULL THEN
      SELECT user_id INTO _responsible_user_id
      FROM company_members
      WHERE company_id = _company_id
      LIMIT 1;
    END IF;
    
    -- Criar equipe padrão se necessário
    INSERT INTO teams (
      name,
      description,
      color,
      icon,
      icon_color,
      icon_bg,
      user_id,
      company_id
    ) VALUES (
      'Equipe Padrão',
      'Equipe criada automaticamente para tarefas do sistema',
      '#3B82F6',
      '👥',
      '#FFFFFF',
      '#3B82F6',
      _responsible_user_id,
      _company_id
    ) RETURNING id INTO _team_id;
  ELSE
    -- Buscar responsável (primeiro membro da equipe ou admin da empresa)
    SELECT user_id INTO _responsible_user_id
    FROM company_members
    WHERE company_id = _company_id
      AND role IN ('owner', 'admin')
    LIMIT 1;
  END IF;

  -- Se ainda não encontrar responsável, buscar qualquer membro
  IF _responsible_user_id IS NULL THEN
    SELECT user_id INTO _responsible_user_id
    FROM company_members
    WHERE company_id = _company_id
    LIMIT 1;
  END IF;

  -- Criar a tarefa
  INSERT INTO tasks (
    title,
    description,
    status,
    priority,
    team_id,
    user_id,
    company_id,
    responsible_name,
    origin,
    related_campaign_id,
    related_client_id,
    alert_id,
    due_date,
    deadline,
    progress
  ) VALUES (
    _title,
    _alert_description,
    'todo',
    _priority,
    _team_id,
    _responsible_user_id,
    _company_id,
    (SELECT full_name FROM profiles WHERE user_id = _responsible_user_id LIMIT 1),
    'automation',
    _related_campaign_id,
    _related_client_id,
    _alert_id,
    _due_date,
    _due_date::date,
    0
  ) RETURNING id INTO _task_id;

  RETURN _task_id;
END;
$function$;