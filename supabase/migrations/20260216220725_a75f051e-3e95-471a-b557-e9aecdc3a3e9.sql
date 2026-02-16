
-- Function to execute task flow automations when a task changes column/etapa
CREATE OR REPLACE FUNCTION public.execute_task_flow_automation()
RETURNS TRIGGER AS $$
DECLARE
  flow_record RECORD;
  node_record RECORD;
  edge_record RECORD;
  source_column_id UUID;
  target_column_id UUID;
  target_user_id UUID;
  target_etapa TEXT;
  action_type TEXT;
  flow_nodes JSONB;
  flow_edges JSONB;
  new_task_id UUID;
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

    -- Skip if no nodes or edges
    IF flow_nodes IS NULL OR flow_edges IS NULL THEN
      CONTINUE;
    END IF;

    -- Find edges where the source node matches the current column
    FOR edge_record IN
      SELECT 
        e->>'source' AS source_id,
        e->>'target' AS target_id,
        e->'data'->>'actionType' AS action_type
      FROM jsonb_array_elements(flow_edges) AS e
    LOOP
      -- Find source node's columnId
      source_column_id := NULL;
      target_column_id := NULL;
      target_user_id := NULL;
      target_etapa := NULL;
      action_type := edge_record.action_type;

      -- Get source node column ID
      SELECT (n->'data'->>'columnId')::UUID INTO source_column_id
      FROM jsonb_array_elements(flow_nodes) AS n
      WHERE n->>'id' = edge_record.source_id;

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
      WHERE n->>'id' = edge_record.target_id;

      IF target_column_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Execute action based on type
      IF action_type = 'move' THEN
        -- Move: update the current task to the target column
        UPDATE public.tasks
        SET quadro_column_id = target_column_id,
            etapa = target_etapa,
            assigned_user_id = target_user_id,
            updated_at = now()
        WHERE id = NEW.id;

        -- Update NEW record so trigger returns correct data
        NEW.quadro_column_id := target_column_id;
        NEW.etapa := target_etapa;
        NEW.assigned_user_id := target_user_id;

      ELSIF action_type = 'copy' THEN
        -- Copy: create a duplicate task in the target column
        INSERT INTO public.tasks (
          user_id, team_id, title, description,
          responsible_name, responsible_avatar,
          status, priority, deadline, start_date,
          progress, company_id, origin,
          assigned_user_id, quadro_column_id, etapa,
          related_campaign_id, related_client_id,
          parent_task_id
        )
        SELECT
          NEW.user_id, NEW.team_id, NEW.title, NEW.description,
          NEW.responsible_name, NEW.responsible_avatar,
          'todo', NEW.priority, NEW.deadline, NEW.start_date,
          0, NEW.company_id, 'flow',
          target_user_id, target_column_id, target_etapa,
          NEW.related_campaign_id, NEW.related_client_id,
          NEW.parent_task_id;

      ELSIF action_type = 'ghost' THEN
        -- Ghost: create a linked reference (copy with origin='ghost')
        INSERT INTO public.tasks (
          user_id, team_id, title, description,
          responsible_name, responsible_avatar,
          status, priority, deadline, start_date,
          progress, company_id, origin,
          assigned_user_id, quadro_column_id, etapa,
          related_campaign_id, related_client_id,
          parent_task_id
        )
        SELECT
          NEW.user_id, NEW.team_id, '[Ghost] ' || NEW.title, NEW.description,
          NEW.responsible_name, NEW.responsible_avatar,
          'todo', NEW.priority, NEW.deadline, NEW.start_date,
          0, NEW.company_id, 'ghost',
          target_user_id, target_column_id, target_etapa,
          NEW.related_campaign_id, NEW.related_client_id,
          NEW.id;  -- parent_task_id points to original

      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on tasks table for column changes
DROP TRIGGER IF EXISTS trg_execute_task_flow ON public.tasks;
CREATE TRIGGER trg_execute_task_flow
  BEFORE UPDATE OF quadro_column_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_task_flow_automation();
