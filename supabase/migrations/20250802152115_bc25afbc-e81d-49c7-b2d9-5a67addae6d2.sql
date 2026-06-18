-- Remove a constraint única global de email e adiciona uma constraint única composta (email + company_id)
-- Isso permitirá que o mesmo usuário seja colaborador em múltiplas empresas

-- Primeiro, remover a constraint única global de email
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_email_key;
DO $$ BEGIN
  ALTER TABLE public.employees ADD CONSTRAINT unique_employee_company_email 
UNIQUE (email, company_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Comentário para documentar a mudança
COMMENT ON CONSTRAINT unique_employee_company_email ON public.employees IS 
'Permite que o mesmo usuário (email) seja colaborador em múltiplas empresas diferentes';