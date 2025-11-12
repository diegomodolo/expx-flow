-- Add status cache columns to clients table
ALTER TABLE clients 
ADD COLUMN calculated_status TEXT,
ADD COLUMN status_explanation TEXT,
ADD COLUMN status_calculated_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX idx_clients_calculated_status ON clients(calculated_status) WHERE calculated_status IS NOT NULL;
CREATE INDEX idx_clients_status_calculated_at ON clients(status_calculated_at) WHERE status_calculated_at IS NOT NULL;