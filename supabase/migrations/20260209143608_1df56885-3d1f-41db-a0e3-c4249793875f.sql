
-- Tabela de grupos de permissão
CREATE TABLE public.permission_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões associadas ao grupo
CREATE TABLE public.permission_group_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  menu_item public.menu_item_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, menu_item)
);

-- Membros do grupo (colaboradores)
CREATE TABLE public.permission_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, employee_id)
);

-- RLS
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_group_members ENABLE ROW LEVEL SECURITY;

-- Policies para permission_groups
CREATE POLICY "Users can view permission groups of their company"
  ON public.permission_groups FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create permission groups for their company"
  ON public.permission_groups FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update permission groups of their company"
  ON public.permission_groups FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete permission groups of their company"
  ON public.permission_groups FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Policies para permission_group_items
CREATE POLICY "Users can view group items"
  ON public.permission_group_items FOR SELECT
  USING (group_id IN (SELECT id FROM public.permission_groups WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage group items"
  ON public.permission_group_items FOR INSERT
  WITH CHECK (group_id IN (SELECT id FROM public.permission_groups WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete group items"
  ON public.permission_group_items FOR DELETE
  USING (group_id IN (SELECT id FROM public.permission_groups WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- Policies para permission_group_members
CREATE POLICY "Users can view group members"
  ON public.permission_group_members FOR SELECT
  USING (group_id IN (SELECT id FROM public.permission_groups WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage group members"
  ON public.permission_group_members FOR INSERT
  WITH CHECK (group_id IN (SELECT id FROM public.permission_groups WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete group members"
  ON public.permission_group_members FOR DELETE
  USING (group_id IN (SELECT id FROM public.permission_groups WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- Trigger para updated_at
CREATE TRIGGER update_permission_groups_updated_at
  BEFORE UPDATE ON public.permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
