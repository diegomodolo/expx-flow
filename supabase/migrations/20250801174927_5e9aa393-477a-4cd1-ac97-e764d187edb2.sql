-- Verificar se o usuário atual tem permissões na empresa
-- Atualizar política para permitir que admins e owners criem colaboradores
DROP POLICY IF EXISTS "Company members can create employees" ON public.employees;

CREATE POLICY "Company admins and owners can create employees" 
ON public.employees 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid()
    AND company_members.role IN ('owner', 'admin')
  )
);