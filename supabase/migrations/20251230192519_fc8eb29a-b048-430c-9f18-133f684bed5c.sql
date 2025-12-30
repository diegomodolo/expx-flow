-- Add is_canceled and canceled_at columns to clients table
ALTER TABLE public.clients 
ADD COLUMN is_canceled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.clients 
ADD COLUMN canceled_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance on filtered queries
CREATE INDEX idx_clients_is_canceled ON public.clients(company_id, is_canceled);