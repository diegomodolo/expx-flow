-- Criar enum para os itens do menu
CREATE TYPE public.menu_item_type AS ENUM (
  'dashboard',
  'clientes', 
  'campanhas',
  'squad',
  'tarefas',
  'colaboradores',
  'relatorios',
  'gerador-campanhas',
  'configuracoes'
);

-- Criar tabela de permissões dos colaboradores
CREATE TABLE public.employee_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  menu_item menu_item_type NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, menu_item)
);

-- Enable RLS
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employee_permissions
CREATE POLICY "Company admins can manage employee permissions" 
ON public.employee_permissions 
FOR ALL
USING (
  company_id IN (
    SELECT company_members.company_id
    FROM company_members
    WHERE company_members.user_id = auth.uid() 
    AND company_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Employees can view their own permissions" 
ON public.employee_permissions 
FOR SELECT
USING (
  employee_id IN (
    SELECT employees.id
    FROM employees
    WHERE employees.user_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_employee_permissions_updated_at
  BEFORE UPDATE ON public.employee_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar permissões padrão para novos colaboradores
CREATE OR REPLACE FUNCTION public.create_default_permissions_for_employee()
RETURNS TRIGGER AS $$
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
    (NEW.id, NEW.company_id, 'configuracoes', false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar permissões padrão quando um novo employee é criado
CREATE TRIGGER create_default_permissions_trigger
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_permissions_for_employee();