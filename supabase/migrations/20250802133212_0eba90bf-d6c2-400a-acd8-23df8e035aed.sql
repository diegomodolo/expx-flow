-- Criar colaboradores para usuários existentes que não têm colaborador na sua própria empresa
INSERT INTO public.employees (
  user_id,
  company_id,
  name,
  email,
  role,
  status,
  start_date
)
SELECT DISTINCT
  c.created_by as user_id,
  c.id as company_id,
  COALESCE(p.full_name, 'Proprietário') as name,
  c.email,
  'Proprietário' as role,
  'active' as status,
  c.created_at::date as start_date
FROM companies c
LEFT JOIN profiles p ON c.created_by = p.user_id
LEFT JOIN employees e ON c.created_by = e.user_id AND c.id = e.company_id
WHERE e.id IS NULL  -- Só inserir se não existir colaborador
ON CONFLICT (company_id, email) DO NOTHING;