-- Add missing permissions for existing employees
INSERT INTO public.employee_permissions (employee_id, company_id, menu_item, is_enabled)
SELECT 
    e.id as employee_id,
    e.company_id,
    'gerador-conteudo' as menu_item,
    false as is_enabled
FROM public.employees e
WHERE e.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM public.employee_permissions ep 
    WHERE ep.employee_id = e.id AND ep.menu_item = 'gerador-conteudo'
);

INSERT INTO public.employee_permissions (employee_id, company_id, menu_item, is_enabled)
SELECT 
    e.id as employee_id,
    e.company_id,
    'ia' as menu_item,
    false as is_enabled
FROM public.employees e
WHERE e.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM public.employee_permissions ep 
    WHERE ep.employee_id = e.id AND ep.menu_item = 'ia'
);