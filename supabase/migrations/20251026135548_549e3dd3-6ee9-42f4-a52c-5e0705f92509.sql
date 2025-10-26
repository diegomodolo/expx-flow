-- Função para criar regras padrão para uma empresa
CREATE OR REPLACE FUNCTION create_default_client_status_rules(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Deletar regras existentes da empresa (se houver)
  DELETE FROM client_status_rules WHERE company_id = p_company_id;
  
  -- Regra 1: Sem Fundos
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Sem Fundos',
    1,
    'sem_fundos',
    true,
    jsonb_build_object(
      'logic', 'OR',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'has_funding_issues', 'operator', '=', 'value', true, 'type', 'boolean'),
        jsonb_build_object('field', 'account_status', 'operator', '!=', 'value', 1, 'type', 'number'),
        jsonb_build_object('field', 'account_balance', 'operator', '<=', 'value', 0, 'type', 'number')
      )
    )
  );
  
  -- Regra 2: Inativo por Inatividade
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Inativo por Inatividade',
    2,
    'inativo',
    true,
    jsonb_build_object(
      'logic', 'OR',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'recent_campaigns_count', 'operator', '=', 'value', 0, 'type', 'number')
      )
    )
  );
  
  -- Regra 3: Emergencial - Poucos Leads
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Emergencial - Poucos Leads',
    3,
    'emergencial',
    true,
    jsonb_build_object(
      'logic', 'AND',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'current_week_leads', 'operator', '<', 'value', 7, 'type', 'number')
      )
    )
  );
  
  -- Regra 4: Emergencial - Múltiplos Critérios
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Emergencial - Múltiplos Critérios',
    4,
    'emergencial',
    true,
    jsonb_build_object(
      'logic', 'OR',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'active_campaigns_count', 'operator', '=', 'value', 0, 'type', 'number'),
        jsonb_build_object('field', 'has_reproved_ads', 'operator', '=', 'value', true, 'type', 'boolean'),
        jsonb_build_object('field', 'days_since_last_optimization', 'operator', '>', 'value', 30, 'type', 'number')
      )
    )
  );
  
  -- Regra 5: Atenção
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Atenção',
    5,
    'atencao',
    true,
    jsonb_build_object(
      'logic', 'OR',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'lead_drop_percentage', 'operator', '>=', 'value', 30, 'type', 'number'),
        jsonb_build_object('field', 'has_quality_issues', 'operator', '=', 'value', true, 'type', 'boolean')
      )
    )
  );
  
  -- Regra 6: Excelente - Opção 1
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Excelente - Alto Volume com Bom CPA',
    6,
    'excelente',
    true,
    jsonb_build_object(
      'logic', 'AND',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'current_week_leads', 'operator', '>=', 'value', 30, 'type', 'number'),
        jsonb_build_object('field', 'current_week_cpa', 'operator', '<=', 'value', 25, 'type', 'number'),
        jsonb_build_object('field', 'current_week_cpa', 'operator', '>', 'value', 0, 'type', 'number')
      )
    )
  );
  
  -- Regra 7: Excelente - Opção 2
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Excelente - Médio Volume com CPA Baixo',
    7,
    'excelente',
    true,
    jsonb_build_object(
      'logic', 'AND',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'current_week_leads', 'operator', '>=', 'value', 20, 'type', 'number'),
        jsonb_build_object('field', 'current_week_cpa', 'operator', '<=', 'value', 15, 'type', 'number'),
        jsonb_build_object('field', 'current_week_cpa', 'operator', '>', 'value', 0, 'type', 'number')
      )
    )
  );
  
  -- Regra 8: Excelente - Opção 3
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Excelente - Altíssimo Volume',
    8,
    'excelente',
    true,
    jsonb_build_object(
      'logic', 'AND',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'current_week_leads', 'operator', '>=', 'value', 100, 'type', 'number'),
        jsonb_build_object('field', 'current_week_cpa', 'operator', '<=', 'value', 35, 'type', 'number'),
        jsonb_build_object('field', 'current_week_cpa', 'operator', '>', 'value', 0, 'type', 'number')
      )
    )
  );
  
  -- Regra 9: Excelente - Opção 4 (CTR Alto + Otimização Recente)
  INSERT INTO client_status_rules (
    company_id, rule_name, rule_order, status_output, is_default, conditions
  ) VALUES (
    p_company_id,
    'Excelente - CTR Alto e Bem Otimizado',
    9,
    'excelente',
    true,
    jsonb_build_object(
      'logic', 'AND',
      'conditions', jsonb_build_array(
        jsonb_build_object('field', 'average_ctr', 'operator', '>', 'value', 1.5, 'type', 'number'),
        jsonb_build_object('field', 'days_since_last_optimization', 'operator', '<', 'value', 7, 'type', 'number')
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar regras padrão para todas as empresas existentes
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM create_default_client_status_rules(company_record.id);
  END LOOP;
END $$;