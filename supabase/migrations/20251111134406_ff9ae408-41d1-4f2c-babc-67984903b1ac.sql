-- Corrigir search_path da função de automação com CASCADE
DROP FUNCTION IF EXISTS update_automation_rules_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER automation_rules_updated_at
  BEFORE UPDATE ON campaign_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_rules_updated_at();