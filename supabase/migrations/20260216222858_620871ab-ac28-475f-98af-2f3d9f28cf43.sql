
CREATE OR REPLACE FUNCTION public.execute_task_flow_automation()
RETURNS TRIGGER AS $$
DECLARE
  flow_record RECORD;
  source_column_id UUID;
  target_column_id UUID;
  target_user_id UUID;
  target_etapa TEXT;
  action_type TEXT;
  flow_nodes JSONB;
  flow_edges JSONB;
  prop_changes JSONB;
  emp_name TEXT;
BEGIN
  IF OLD.quadro_column_id IS NOT DISTINCT FROM NEW.quadro_column_id THEN
    RETURN NEW;
  END IF;

  IF NEW.quadro_column_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR flow_record IN
    SELECT id, flow_data
    FROM public.task_flows
    WHERE company_id = NEW.company_id
      AND is_active = true
      AND flow_data IS NOT NULL
  LOOP
    flow_nodes := (flow_record.flow_data)::jsonb -> 'nodes';
    flow_edges := (flow_record.flow_data)::jsonb -> 'edges';

    IF flow_nodes IS NULL OR flow_edges IS NULL THEN
      CONTINUE;
    END IF;

    DECLARE
      edge_rec RECORD;
    BEGIN
      FOR edge_rec IN
        SELECT 
          e->>'source' AS source_id,
          e->>'target' AS target_id,
          e->'data'->>'actionType' AS edge_action_type,
          e->'data'->'propertyChanges' AS edge_property_changes
        FROM jsonb_array_elements(flow_edges) AS e
      LOOP
        source_column_id := NULL;
        target_column_id := NULL;
        target_user_id := NULL;
        target_etapa := NULL;
        action_type := edge_rec.edge_action_type;
        prop_changes := edge_rec.edge_property_changes;

        SELECT (n->'data'->>'columnId')::UUID INTO source_column_id
        FROM jsonb_array_elements(flow_nodes) AS n
        WHERE n->>'id' = edge_rec.source_id;

        IF source_column_id IS NULL OR source_column_id != NEW.quadro_column_id THEN
          CONTINUE;
        END IF;

        SELECT 
          (n->'data'->>'columnId')::UUID,
          (n->'data'->>'userId')::UUID,
          n->'data'->>'columnName'
        INTO target_column_id, target_user_id, target_etapa
        FROM jsonb_array_elements(flow_nodes) AS n
        WHERE n->>'id' = edge_rec.target_id;

        IF target_column_id IS NULL THEN
          CONTINUE;
        END IF;

        -- Apply property changes (for all action types)
        IF prop_changes IS NOT NULL THEN
          -- Status change
          IF (prop_changes->>'changeStatus')::boolean = true AND prop_changes->>'newStatus' IS NOT NULL THEN
            NEW.status := prop_changes->>'newStatus';
          END IF;

          -- Responsible change
          IF (prop_changes->>'changeResponsible')::boolean = true AND prop_changes->>'newResponsibleUserId' IS NOT NULL THEN
            NEW.assigned_user_id := (prop_changes->>'newResponsibleUserId')::UUID;
            -- Get employee name for responsible_name
            SELECT name INTO emp_name FROM public.employees 
            WHERE user_id = (prop_changes->>'newResponsibleUserId')::UUID 
              AND company_id = NEW.company_id 
            LIMIT 1;
            IF emp_name IS NOT NULL THEN
              NEW.responsible_name := emp_name;
            END IF;
          END IF;

          -- Classificação change
          IF (prop_changes->>'changeClassificacao')::boolean = true AND prop_changes->>'newClassificacaoId' IS NOT NULL THEN
            NEW.classificacao_id := (prop_changes->>'newClassificacaoId')::UUID;
          END IF;
        END IF;

        IF action_type = 'move' THEN
          NEW.quadro_column_id := target_column_id;
          NEW.etapa := target_etapa;
          -- Only override assigned_user_id/user_id with target if no explicit responsible change
          IF prop_changes IS NULL OR (prop_changes->>'changeResponsible')::boolean IS NOT TRUE THEN
            NEW.assigned_user_id := target_user_id;
          END IF;
          NEW.user_id := target_user_id;
          -- Only reset status if no explicit status change configured
          IF prop_changes IS NULL OR (prop_changes->>'changeStatus')::boolean IS NOT TRUE THEN
            NEW.status := 'todo';
          END IF;
          NEW.progress := 0;
          NEW.updated_at := now();

        ELSIF action_type = 'copy' THEN
          INSERT INTO public.tasks (
            user_id, team_id, title, description,
            responsible_name, responsible_avatar,
            status, priority, deadline, start_date,
            progress, company_id, origin,
            assigned_user_id, quadro_column_id, etapa,
            related_campaign_id, related_client_id,
            parent_task_id, classificacao_id
          )
          VALUES (
            target_user_id, NEW.team_id, NEW.title, NEW.description,
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeResponsible')::boolean = true 
                THEN prop_changes->>'newResponsibleName' ELSE NULL END,
              NEW.responsible_name
            ),
            NEW.responsible_avatar,
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeStatus')::boolean = true 
                THEN prop_changes->>'newStatus' ELSE NULL END,
              'todo'
            ),
            NEW.priority, NEW.deadline, NEW.start_date,
            0, NEW.company_id, 'flow',
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeResponsible')::boolean = true 
                THEN (prop_changes->>'newResponsibleUserId')::UUID ELSE NULL END,
              target_user_id
            ),
            target_column_id, target_etapa,
            NEW.related_campaign_id, NEW.related_client_id,
            NEW.parent_task_id,
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeClassificacao')::boolean = true 
                THEN (prop_changes->>'newClassificacaoId')::UUID ELSE NULL END,
              NEW.classificacao_id
            )
          );

        ELSIF action_type = 'ghost' THEN
          INSERT INTO public.tasks (
            user_id, team_id, title, description,
            responsible_name, responsible_avatar,
            status, priority, deadline, start_date,
            progress, company_id, origin,
            assigned_user_id, quadro_column_id, etapa,
            related_campaign_id, related_client_id,
            parent_task_id, classificacao_id
          )
          VALUES (
            target_user_id, NEW.team_id, '[Ghost] ' || NEW.title, NEW.description,
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeResponsible')::boolean = true 
                THEN prop_changes->>'newResponsibleName' ELSE NULL END,
              NEW.responsible_name
            ),
            NEW.responsible_avatar,
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeStatus')::boolean = true 
                THEN prop_changes->>'newStatus' ELSE NULL END,
              'todo'
            ),
            NEW.priority, NEW.deadline, NEW.start_date,
            0, NEW.company_id, 'ghost',
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeResponsible')::boolean = true 
                THEN (prop_changes->>'newResponsibleUserId')::UUID ELSE NULL END,
              target_user_id
            ),
            target_column_id, target_etapa,
            NEW.related_campaign_id, NEW.related_client_id,
            NEW.id,
            COALESCE(
              CASE WHEN prop_changes IS NOT NULL AND (prop_changes->>'changeClassificacao')::boolean = true 
                THEN (prop_changes->>'newClassificacaoId')::UUID ELSE NULL END,
              NEW.classificacao_id
            )
          );
        END IF;
      END LOOP;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
