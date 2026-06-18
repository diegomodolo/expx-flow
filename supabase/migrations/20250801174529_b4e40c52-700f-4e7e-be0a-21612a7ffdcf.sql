-- Update employees table to require company_id
ALTER TABLE public.employees 
ALTER COLUMN company_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.employees 
ADD CONSTRAINT unique_employee_company_email UNIQUE (company_id, email);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
