
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
BEGIN
  -- Only proceed if quadro_column_id actually changed
  IF OLD.quadro_column_id IS NOT DISTINCT FROM NEW.quadro_column_id THEN
    RETURN NEW;
  END IF;

  -- Skip if no column assigned
  IF NEW.quadro_column_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find all active flows for this company
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

    -- Check each edge
    DECLARE
      edge_rec RECORD;
    BEGIN
      FOR edge_rec IN
        SELECT 
          e->>'source' AS source_id,
          e->>'target' AS target_id,
          e->'data'->>'actionType' AS edge_action_type
        FROM jsonb_array_elements(flow_edges) AS e
      LOOP
        source_column_id := NULL;
        target_column_id := NULL;
        target_user_id := NULL;
        target_etapa := NULL;
        action_type := edge_rec.edge_action_type;

        -- Get source node column ID
        SELECT (n->'data'->>'columnId')::UUID INTO source_column_id
        FROM jsonb_array_elements(flow_nodes) AS n
        WHERE n->>'id' = edge_rec.source_id;

        -- Check if this edge matches the task's new column
        IF source_column_id IS NULL OR source_column_id != NEW.quadro_column_id THEN
          CONTINUE;
        END IF;

        -- Get target node data
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

        IF action_type = 'move' THEN
          -- Move: just modify the NEW record directly (BEFORE trigger)
          NEW.quadro_column_id := target_column_id;
          NEW.etapa := target_etapa;
          NEW.assigned_user_id := target_user_id;
          NEW.updated_at := now();

        ELSIF action_type = 'copy' THEN
          INSERT INTO public.tasks (
            user_id, team_id, title, description,
            responsible_name, responsible_avatar,
            status, priority, deadline, start_date,
            progress, company_id, origin,
            assigned_user_id, quadro_column_id, etapa,
            related_campaign_id, related_client_id,
            parent_task_id
          )
          VALUES (
            NEW.user_id, NEW.team_id, NEW.title, NEW.description,
            NEW.responsible_name, NEW.responsible_avatar,
            'todo', NEW.priority, NEW.deadline, NEW.start_date,
            0, NEW.company_id, 'flow',
            target_user_id, target_column_id, target_etapa,
            NEW.related_campaign_id, NEW.related_client_id,
            NEW.parent_task_id
          );

        ELSIF action_type = 'ghost' THEN
          INSERT INTO public.tasks (
            user_id, team_id, title, description,
            responsible_name, responsible_avatar,
            status, priority, deadline, start_date,
            progress, company_id, origin,
            assigned_user_id, quadro_column_id, etapa,
            related_campaign_id, related_client_id,
            parent_task_id
          )
          VALUES (
            NEW.user_id, NEW.team_id, '[Ghost] ' || NEW.title, NEW.description,
            NEW.responsible_name, NEW.responsible_avatar,
            'todo', NEW.priority, NEW.deadline, NEW.start_date,
            0, NEW.company_id, 'ghost',
            target_user_id, target_column_id, target_etapa,
            NEW.related_campaign_id, NEW.related_client_id,
            NEW.id
          );
        END IF;
      END LOOP;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
