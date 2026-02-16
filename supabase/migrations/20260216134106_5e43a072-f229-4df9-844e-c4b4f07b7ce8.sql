
-- Task categories
CREATE TABLE public.task_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task_categorias" ON public.task_categorias
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert task_categorias" ON public.task_categorias
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete task_categorias" ON public.task_categorias
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Task classifications
CREATE TABLE public.task_classificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_classificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task_classificacoes" ON public.task_classificacoes
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert task_classificacoes" ON public.task_classificacoes
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete task_classificacoes" ON public.task_classificacoes
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Add columns to tasks
ALTER TABLE public.tasks ADD COLUMN categoria_id UUID REFERENCES public.task_categorias(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN classificacao_id UUID REFERENCES public.task_classificacoes(id) ON DELETE SET NULL DEFAULT NULL;
