-- Create automation_settings table
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_name_prefix TEXT NOT NULL DEFAULT 'SHEGrowth',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company automation settings"
  ON automation_settings FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Admins can manage automation settings"
  ON automation_settings FOR ALL
  USING (is_company_admin_or_owner(auth.uid(), company_id));

-- Trigger for updated_at
CREATE TRIGGER update_automation_settings_updated_at
  BEFORE UPDATE ON automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE automation_settings IS 'Stores automation configuration settings per company';
COMMENT ON COLUMN automation_settings.campaign_name_prefix IS 'Prefix to add to campaign names when automations make changes';