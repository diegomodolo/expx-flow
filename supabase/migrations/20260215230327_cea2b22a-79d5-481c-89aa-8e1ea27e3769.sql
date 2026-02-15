
-- Categorias dos roteiros
CREATE TABLE public.roteiro_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  nome TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roteiro_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roteiro_categorias of their company"
  ON public.roteiro_categorias FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert roteiro_categorias"
  ON public.roteiro_categorias FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update roteiro_categorias"
  ON public.roteiro_categorias FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete roteiro_categorias"
  ON public.roteiro_categorias FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

-- Roteiros
CREATE TABLE public.roteiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  categoria_id UUID REFERENCES public.roteiro_categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  icone TEXT DEFAULT 'BookOpen',
  objetivo TEXT,
  publico BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roteiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roteiros of their company"
  ON public.roteiros FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert roteiros"
  ON public.roteiros FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update roteiros"
  ON public.roteiros FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete roteiros"
  ON public.roteiros FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

-- Atividades dos roteiros
CREATE TABLE public.roteiro_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roteiro_id UUID NOT NULL REFERENCES public.roteiros(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT,
  inicio_apos_dias INTEGER DEFAULT 0,
  duracao_dias INTEGER DEFAULT 1,
  responsavel_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  quadro_column_id UUID,
  etapa TEXT,
  fluxo TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  descricao TEXT,
  autorizador_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  checklist JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roteiro_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roteiro_atividades"
  ON public.roteiro_atividades FOR SELECT
  USING (roteiro_id IN (SELECT id FROM public.roteiros WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert roteiro_atividades"
  ON public.roteiro_atividades FOR INSERT
  WITH CHECK (roteiro_id IN (SELECT id FROM public.roteiros WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can update roteiro_atividades"
  ON public.roteiro_atividades FOR UPDATE
  USING (roteiro_id IN (SELECT id FROM public.roteiros WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete roteiro_atividades"
  ON public.roteiro_atividades FOR DELETE
  USING (roteiro_id IN (SELECT id FROM public.roteiros WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

-- Triggers para updated_at
CREATE TRIGGER update_roteiro_categorias_updated_at
  BEFORE UPDATE ON public.roteiro_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_pool_updated_at();

CREATE TRIGGER update_roteiros_updated_at
  BEFORE UPDATE ON public.roteiros
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_pool_updated_at();

CREATE TRIGGER update_roteiro_atividades_updated_at
  BEFORE UPDATE ON public.roteiro_atividades
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_pool_updated_at();
