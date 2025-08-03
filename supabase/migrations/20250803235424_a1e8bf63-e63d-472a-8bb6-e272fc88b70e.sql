-- Criar permissões padrão para colaboradores existentes que não possuem permissões ainda
INSERT INTO public.employee_permissions (employee_id, company_id, menu_item, is_enabled)
SELECT 
  e.id,
  e.company_id,
  menu_item::menu_item_type,
  CASE 
    WHEN menu_item IN ('dashboard', 'tarefas') THEN true
    ELSE false
  END as is_enabled
FROM employees e
CROSS JOIN (
  VALUES 
    ('dashboard'),
    ('clientes'),
    ('campanhas'),
    ('squad'),
    ('tarefas'),
    ('colaboradores'),
    ('relatorios'),
    ('gerador-campanhas'),
    ('configuracoes')
) AS menu_items(menu_item)
WHERE NOT EXISTS (
  SELECT 1 
  FROM employee_permissions ep 
  WHERE ep.employee_id = e.id 
  AND ep.menu_item = menu_item::menu_item_type
)
AND e.status = 'active';