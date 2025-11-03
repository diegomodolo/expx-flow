-- Deletar empresa "Sergio" criada automaticamente para o usuário sergiofrancacf@gmail.com
-- Empresa ID: 48888a0c-ebeb-4528-9bc0-cc98a45af10f

-- 1. Deletar employee (colaborador) primeiro devido a foreign keys
DELETE FROM employees 
WHERE company_id = '48888a0c-ebeb-4528-9bc0-cc98a45af10f';

-- 2. Deletar company_member (associação)
DELETE FROM company_members 
WHERE company_id = '48888a0c-ebeb-4528-9bc0-cc98a45af10f';

-- 3. Deletar a empresa
DELETE FROM companies 
WHERE id = '48888a0c-ebeb-4528-9bc0-cc98a45af10f';