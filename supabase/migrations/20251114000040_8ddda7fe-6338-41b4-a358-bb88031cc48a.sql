-- Remove o check constraint antigo
ALTER TABLE campaign_automation_rules 
DROP CONSTRAINT IF EXISTS campaign_automation_rules_action_type_check;

-- Adiciona o novo check constraint com as ações de duplicação
ALTER TABLE campaign_automation_rules
ADD CONSTRAINT campaign_automation_rules_action_type_check 
CHECK (action_type IN (
  'pause_campaign',
  'activate_campaign', 
  'increase_budget',
  'decrease_budget',
  'duplicate_campaign',
  'pause_adset',
  'activate_adset',
  'increase_adset_budget',
  'decrease_adset_budget',
  'duplicate_adset',
  'pause_ad',
  'activate_ad',
  'duplicate_ad',
  'notify_only'
));