-- Criar colaboradores para proprietários de empresas que não têm NENHUM colaborador na empresa
INSERT INTO public.employees (
  user_id,
  company_id,
  name,
  email,
  role,
  status,
  start_date
)
SELECT 
  c.created_by as user_id,
  c.id as company_id,
  COALESCE(p.full_name, 'Proprietário') as name,
  CONCAT('owner+', c.id::text, '@', SPLIT_PART(c.email, '@', 2)) as email, -- Email único para evitar conflitos
  'Proprietário' as role,
  'active' as status,
  c.created_at::date as start_date
FROM companies c
LEFT JOIN profiles p ON c.created_by = p.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.user_id = c.created_by AND e.company_id = c.id
);