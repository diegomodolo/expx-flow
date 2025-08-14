-- First, create the menu_item enum type
CREATE TYPE public.menu_item AS ENUM (
  'dashboard',
  'clientes',
  'campanhas',
  'squad',
  'tarefas',
  'colaboradores',
  'relatorios',
  'gerador-campanhas',
  'gerador-conteudo',
  'ia',
  'configuracoes'
);

-- Update the employee_permissions table to use the enum
ALTER TABLE public.employee_permissions ALTER COLUMN menu_item TYPE public.menu_item USING menu_item::public.menu_item;