-- Add inactive_reason column to clients table
ALTER TABLE public.clients 
ADD COLUMN inactive_reason TEXT;