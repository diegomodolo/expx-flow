-- Add is_archived field to crm_leads table
ALTER TABLE crm_leads 
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_crm_leads_is_archived ON crm_leads(is_archived);

-- Add index for common query pattern (workspace + not archived)
CREATE INDEX idx_crm_leads_workspace_archived ON crm_leads(workspace_id, is_archived);