-- Add sync_options column to google_ads_sync_schedules
ALTER TABLE google_ads_sync_schedules 
ADD COLUMN IF NOT EXISTS sync_options jsonb DEFAULT '{"period": "last_30_days", "campaigns": true, "adGroups": false, "ads": false, "includeInactive": false}'::jsonb;

-- Create google_ads_sync_execution_logs table (mirroring facebook_sync_execution_logs)
CREATE TABLE IF NOT EXISTS google_ads_sync_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES google_ads_sync_schedules(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  clients_processed integer NOT NULL DEFAULT 0,
  clients_total integer NOT NULL DEFAULT 0,
  sync_options jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  execution_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_ads_sync_execution_logs_company_id 
  ON google_ads_sync_execution_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_sync_execution_logs_started_at 
  ON google_ads_sync_execution_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_ads_sync_execution_logs_schedule_id 
  ON google_ads_sync_execution_logs(schedule_id);

-- Enable RLS
ALTER TABLE google_ads_sync_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_ads_sync_execution_logs
CREATE POLICY "Users can view execution logs of their companies" 
  ON google_ads_sync_execution_logs 
  FOR SELECT 
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Service role can manage execution logs" 
  ON google_ads_sync_execution_logs 
  FOR ALL 
  USING (true)
  WITH CHECK (true);