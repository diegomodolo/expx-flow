-- Update employees table to require company_id
ALTER TABLE public.employees 
ALTER COLUMN company_id SET NOT NULL;

-- Add constraint to prevent duplicate employees in same company
ALTER TABLE public.employees 
ADD CONSTRAINT unique_employee_company_email UNIQUE (company_id, email);