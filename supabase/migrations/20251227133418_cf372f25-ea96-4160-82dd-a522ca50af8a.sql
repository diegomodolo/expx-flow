-- Add default_value column to crm_boards table
ALTER TABLE public.crm_boards 
ADD COLUMN default_value NUMERIC(15,2) DEFAULT NULL;