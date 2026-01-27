-- Criar tabela de super admins por email
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Política: apenas super admins podem ver a lista
CREATE POLICY "Super admins can view super_admins list"
ON public.super_admins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.super_admins sa
    JOIN auth.users au ON au.email = sa.email
    WHERE au.id = auth.uid()
  )
);

-- Política: apenas super admins podem inserir
CREATE POLICY "Super admins can insert new super_admins"
ON public.super_admins
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.super_admins sa
    JOIN auth.users au ON au.email = sa.email
    WHERE au.id = auth.uid()
  )
);

-- Política: apenas super admins podem deletar
CREATE POLICY "Super admins can delete super_admins"
ON public.super_admins
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.super_admins sa
    JOIN auth.users au ON au.email = sa.email
    WHERE au.id = auth.uid()
  )
);

-- Inserir seu email como primeiro super admin (substitua pelo email correto)
INSERT INTO public.super_admins (email) VALUES ('admin@controledetrafego.com')
ON CONFLICT (email) DO NOTHING;

-- Função para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.super_admins sa
    JOIN auth.users au ON au.email = sa.email
    WHERE au.id = _user_id
  )
$$;