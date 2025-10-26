-- Passo 2: Criar permissões padrão para agentes em colaboradores existentes
INSERT INTO public.employee_permissions (employee_id, company_id, menu_item, is_enabled)
SELECT 
  e.id,
  e.company_id,
  'agentes-ia'::public.menu_item_type,
  false
FROM public.employees e
WHERE e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.employee_permissions ep 
    WHERE ep.employee_id = e.id AND ep.menu_item = 'agentes-ia'
  );

INSERT INTO public.employee_permissions (employee_id, company_id, menu_item, is_enabled)
SELECT 
  e.id,
  e.company_id,
  'editar-agentes'::public.menu_item_type,
  false
FROM public.employees e
WHERE e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.employee_permissions ep 
    WHERE ep.employee_id = e.id AND ep.menu_item = 'editar-agentes'
  );