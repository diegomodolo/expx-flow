-- Add missing columns to whatsapp_client_contacts for notification preferences
ALTER TABLE whatsapp_client_contacts 
ADD COLUMN IF NOT EXISTS receives_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS receives_reports BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'cliente';

-- Update existing records to have default values
UPDATE whatsapp_client_contacts 
SET receives_alerts = true, receives_reports = true, profile_type = 'cliente'
WHERE receives_alerts IS NULL OR receives_reports IS NULL OR profile_type IS NULL;