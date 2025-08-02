-- Add average_ticket column to campaigns table for more accurate ROI calculation
ALTER TABLE public.campaigns 
ADD COLUMN average_ticket NUMERIC DEFAULT 0;