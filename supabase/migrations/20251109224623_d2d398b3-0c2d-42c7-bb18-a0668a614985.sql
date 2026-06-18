-- Drop existing SELECT policies on crm_lead_links
DROP POLICY IF EXISTS "Company members can view lead links" ON crm_lead_links;

DROP POLICY IF EXISTS "Workspace users can view lead links" ON crm_lead_links;
DO $$ BEGIN
  CREATE POLICY "Company members can view lead links"
ON crm_lead_links
FOR SELECT
USING (
  lead_a_id IN (
    SELECT l.id
    FROM crm_leads l
    JOIN crm_workspaces w ON w.id = l.workspace_id
    JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  )
  OR
  lead_b_id IN (
    SELECT l.id
    FROM crm_leads l
    JOIN crm_workspaces w ON w.id = l.workspace_id
    JOIN company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Workspace users can view lead links"
ON crm_lead_links
FOR SELECT
USING (
  lead_a_id IN (
    SELECT id
    FROM crm_leads
    WHERE workspace_id IN (
      SELECT id
      FROM crm_workspaces
      WHERE is_active = true
    )
  )
  OR
  lead_b_id IN (
    SELECT id
    FROM crm_leads
    WHERE workspace_id IN (
      SELECT id
      FROM crm_workspaces
      WHERE is_active = true
    )
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
