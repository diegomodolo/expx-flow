-- Remove a constraint única global de email que está causando conflito
-- Isso permite que o mesmo usuário seja colaborador em múltiplas empresas
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_email_key;

-- Verificar se a constraint composta existe, se não, criar ela
-- Esta constraint garante que não haja duplicação dentro da mesma empresa
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_employee_company_email' 
        AND table_name = 'employees'
    ) THEN
        ALTER TABLE public.employees ADD CONSTRAINT unique_employee_company_email 
        UNIQUE (company_id, email);
    END IF;
END $$;

-- Comentário explicativo
COMMENT ON CONSTRAINT unique_employee_company_email ON public.employees IS 
'Permite que o mesmo usuário (email) seja colaborador em múltiplas empresas diferentes';