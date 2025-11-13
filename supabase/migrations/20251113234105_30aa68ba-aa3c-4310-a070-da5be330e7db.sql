-- Função que sincroniza regras importadas quando template é atualizada
CREATE OR REPLACE FUNCTION sync_imported_rules_from_template()
RETURNS TRIGGER AS $$
DECLARE
  imported_rule RECORD;
  template_conditions JSONB;
  imported_conditions JSONB;
  merged_conditions JSONB;
  template_cond JSONB;
  imported_cond JSONB;
  matching_cond JSONB;
  new_conditions_array JSONB[];
BEGIN
  -- Só executar se for uma regra template
  IF NEW.is_template = FALSE THEN
    RETURN NEW;
  END IF;

  -- Para cada regra importada deste template
  FOR imported_rule IN 
    SELECT * FROM campaign_automation_rules 
    WHERE template_id = NEW.id 
      AND is_template = FALSE
  LOOP
    -- Merge inteligente das condições
    template_conditions := NEW.conditions->'conditions';
    imported_conditions := imported_rule.conditions->'conditions';
    new_conditions_array := ARRAY[]::JSONB[];

    -- Para cada condição da template
    FOR i IN 0..jsonb_array_length(template_conditions) - 1 LOOP
      template_cond := template_conditions->i;
      matching_cond := NULL;

      -- Procurar condição correspondente na regra importada (mesmo field)
      FOR j IN 0..jsonb_array_length(imported_conditions) - 1 LOOP
        imported_cond := imported_conditions->j;
        IF imported_cond->>'field' = template_cond->>'field' THEN
          matching_cond := imported_cond;
          EXIT;
        END IF;
      END LOOP;

      -- Se encontrou correspondência, preservar o valor
      IF matching_cond IS NOT NULL THEN
        new_conditions_array := array_append(
          new_conditions_array,
          jsonb_build_object(
            'field', template_cond->>'field',
            'operator', template_cond->>'operator',
            'value', matching_cond->'value',
            'type', template_cond->>'type'
          )
        );
      ELSE
        -- Nova condição: usar o valor default da template
        new_conditions_array := array_append(
          new_conditions_array,
          jsonb_build_object(
            'field', template_cond->>'field',
            'operator', template_cond->>'operator',
            'value', template_cond->'value',
            'type', template_cond->>'type'
          )
        );
      END IF;
    END LOOP;

    -- Construir JSONB final
    merged_conditions := jsonb_build_object(
      'logic', NEW.conditions->>'logic',
      'conditions', to_jsonb(new_conditions_array)
    );

    -- Atualizar a regra importada
    UPDATE campaign_automation_rules
    SET
      rule_name = NEW.rule_name,
      rule_description = NEW.rule_description,
      rule_order = NEW.rule_order,
      campaign_objectives = NEW.campaign_objectives,
      time_window_days = NEW.time_window_days,
      conditions = merged_conditions,
      action_type = NEW.action_type,
      action_config = NEW.action_config,
      entity_type = NEW.entity_type,
      budget_safety_limits = NEW.budget_safety_limits,
      execution_limits = NEW.execution_limits,
      scope_filters = NEW.scope_filters,
      updated_at = NOW()
    WHERE id = imported_rule.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa após UPDATE em templates
DROP TRIGGER IF EXISTS sync_imported_rules_trigger ON campaign_automation_rules;
CREATE TRIGGER sync_imported_rules_trigger
  AFTER UPDATE ON campaign_automation_rules
  FOR EACH ROW
  WHEN (NEW.is_template = TRUE)
  EXECUTE FUNCTION sync_imported_rules_from_template();

-- Index para melhorar performance da busca
CREATE INDEX IF NOT EXISTS idx_automation_rules_template_id 
  ON campaign_automation_rules(template_id) 
  WHERE template_id IS NOT NULL;