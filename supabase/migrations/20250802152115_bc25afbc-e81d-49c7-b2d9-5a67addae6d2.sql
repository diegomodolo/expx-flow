-- Remove a constraint única global de email e adiciona uma constraint única composta (email + company_id)
-- Isso permitirá que o mesmo usuário seja colaborador em múltiplas empresas

-- Primeiro, remover a constraint única global de email
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_email_key;

-- Adicionar constraint única composta para email + company_id
-- Isso permite que o mesmo email seja usado em diferentes empresas
ALTER TABLE public.employees ADD CONSTRAINT unique_employee_company_email 
UNIQUE (email, company_id);

-- Comentário para documentar a mudança
COMMENT ON CONSTRAINT unique_employee_company_email ON public.employees IS 
'Permite que o mesmo usuário (email) seja colaborador em múltiplas empresas diferentes';