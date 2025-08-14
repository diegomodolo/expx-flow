-- Update the default permissions function to include new menu items
CREATE OR REPLACE FUNCTION public.create_default_permissions_for_employee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar permissões padrão (apenas dashboard e tarefas habilitadas)
  INSERT INTO public.employee_permissions (employee_id, company_id, menu_item, is_enabled)
  VALUES 
    (NEW.id, NEW.company_id, 'dashboard', true),
    (NEW.id, NEW.company_id, 'tarefas', true),
    (NEW.id, NEW.company_id, 'clientes', false),
    (NEW.id, NEW.company_id, 'campanhas', false),
    (NEW.id, NEW.company_id, 'squad', false),
    (NEW.id, NEW.company_id, 'colaboradores', false),
    (NEW.id, NEW.company_id, 'relatorios', false),
    (NEW.id, NEW.company_id, 'gerador-campanhas', false),
    (NEW.id, NEW.company_id, 'gerador-conteudo', false),
    (NEW.id, NEW.company_id, 'ia', false),
    (NEW.id, NEW.company_id, 'configuracoes', false);
  
  RETURN NEW;
END;
$function$