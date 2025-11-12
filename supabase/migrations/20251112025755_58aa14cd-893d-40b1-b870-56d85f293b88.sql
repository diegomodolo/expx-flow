-- Remover TODAS as políticas antigas primeiro
DROP POLICY IF EXISTS "Users can delete automation logs from their company" ON campaign_automation_logs;
DROP POLICY IF EXISTS "Users can view automation logs from their company" ON campaign_automation_logs;
DROP POLICY IF EXISTS "Company members can view automation logs" ON campaign_automation_logs;
DROP POLICY IF EXISTS "Company members can delete automation logs" ON campaign_automation_logs;
DROP POLICY IF EXISTS "Company members can create automation logs" ON campaign_automation_logs;

-- Habilitar RLS
ALTER TABLE campaign_automation_logs ENABLE ROW LEVEL SECURITY;

-- Criar apenas as 3 políticas necessárias
CREATE POLICY "Company members can view logs"
ON campaign_automation_logs
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete logs"
ON campaign_automation_logs
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can insert logs"
ON campaign_automation_logs
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM company_members 
    WHERE user_id = auth.uid()
  )
);