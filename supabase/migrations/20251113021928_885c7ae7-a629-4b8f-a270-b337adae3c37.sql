-- Create automation_schedules table
CREATE TABLE automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  client_id UUID NOT NULL,
  
  -- Scheduling configuration
  is_enabled BOOLEAN DEFAULT false,
  executions_per_day INTEGER NOT NULL DEFAULT 1 CHECK (executions_per_day >= 1 AND executions_per_day <= 24),
  
  -- Calculated times (array of strings in HH:MM format)
  scheduled_times TEXT[] NOT NULL DEFAULT '{}',
  
  -- Cron job IDs (for management)
  cron_job_ids JSONB DEFAULT '[]',
  
  -- Metadata
  last_execution_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one configuration per client
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view schedules"
  ON automation_schedules FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Company members can manage schedules"
  ON automation_schedules FOR ALL
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Indexes
CREATE INDEX idx_automation_schedules_client ON automation_schedules(client_id);
CREATE INDEX idx_automation_schedules_company ON automation_schedules(company_id);
CREATE INDEX idx_automation_schedules_enabled ON automation_schedules(is_enabled) WHERE is_enabled = true;

-- Trigger for updated_at
CREATE TRIGGER update_automation_schedules_updated_at
  BEFORE UPDATE ON automation_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate schedule times
CREATE OR REPLACE FUNCTION calculate_schedule_times(executions INTEGER)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  times TEXT[] := '{}';
  interval_minutes INTEGER;
  current_minutes INTEGER := 0;
  hour INTEGER;
  minute INTEGER;
BEGIN
  -- Calculate interval in minutes
  interval_minutes := (24 * 60) / executions;
  
  -- Generate array of times
  FOR i IN 1..executions LOOP
    hour := current_minutes / 60;
    minute := current_minutes % 60;
    times := array_append(times, 
      LPAD(hour::TEXT, 2, '0') || ':' || LPAD(minute::TEXT, 2, '0')
    );
    current_minutes := current_minutes + interval_minutes;
  END LOOP;
  
  RETURN times;
END;
$$;