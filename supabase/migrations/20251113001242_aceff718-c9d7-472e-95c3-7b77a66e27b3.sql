-- Create table for automation execution progress tracking
CREATE TABLE IF NOT EXISTS automation_execution_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL,
  company_id uuid REFERENCES companies(id),
  client_id uuid REFERENCES clients(id),
  entity_type text NOT NULL, -- 'campaign', 'adset', 'ad'
  entity_name text NOT NULL,
  entity_id uuid,
  facebook_id text,
  status text NOT NULL, -- 'processing', 'evaluated', 'actioned', 'skipped', 'error'
  rule_name text,
  message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_automation_progress_execution 
  ON automation_execution_progress(execution_id, created_at);

CREATE INDEX idx_automation_progress_company 
  ON automation_execution_progress(company_id, created_at);

-- Enable RLS
ALTER TABLE automation_execution_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can view their company's progress
CREATE POLICY "Company members can view automation progress"
  ON automation_execution_progress FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  ));

-- Policy: System can insert progress updates
CREATE POLICY "System can insert automation progress"
  ON automation_execution_progress FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE automation_execution_progress;