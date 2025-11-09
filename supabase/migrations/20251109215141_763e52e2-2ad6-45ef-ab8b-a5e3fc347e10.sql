-- Criar tabela de boards (quadros)
CREATE TABLE IF NOT EXISTS public.crm_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_board_order UNIQUE(workspace_id, order_index)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_boards_workspace ON public.crm_boards(workspace_id, order_index);
CREATE INDEX IF NOT EXISTS idx_crm_boards_default ON public.crm_boards(workspace_id, is_default);

-- Habilitar RLS
ALTER TABLE public.crm_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace users can view boards"
  ON public.crm_boards FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.crm_workspaces WHERE is_active = true
  ));

CREATE POLICY "Company members can manage boards"
  ON public.crm_boards FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM public.crm_workspaces w
    INNER JOIN public.company_members cm ON cm.company_id = w.company_id
    WHERE cm.user_id = auth.uid()
  ));

-- Adicionar coluna board_id à tabela crm_stages
ALTER TABLE public.crm_stages 
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.crm_boards(id) ON DELETE CASCADE;

-- Para cada workspace existente, criar um board padrão
INSERT INTO public.crm_boards (workspace_id, name, is_default, order_index, created_at)
SELECT 
  id,
  'Quadro Principal',
  true,
  1,
  NOW()
FROM public.crm_workspaces
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_boards WHERE workspace_id = crm_workspaces.id
);

-- Associar stages existentes ao board padrão de cada workspace
UPDATE public.crm_stages s
SET board_id = (
  SELECT b.id 
  FROM public.crm_boards b 
  WHERE b.workspace_id = s.workspace_id 
  AND b.is_default = true
  LIMIT 1
)
WHERE board_id IS NULL;

-- Tornar board_id obrigatório após migração
ALTER TABLE public.crm_stages 
ALTER COLUMN board_id SET NOT NULL;

-- Remover constraint antiga de ordem por workspace se existir
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_stage_order'
  ) THEN
    ALTER TABLE public.crm_stages DROP CONSTRAINT unique_stage_order;
  END IF;
END $$;

-- Criar nova constraint de ordem por board
ALTER TABLE public.crm_stages 
DROP CONSTRAINT IF EXISTS unique_stage_order_per_board;

ALTER TABLE public.crm_stages 
ADD CONSTRAINT unique_stage_order_per_board UNIQUE(board_id, order_index);

-- Atualizar índice
DROP INDEX IF EXISTS public.idx_crm_stages_workspace_order;
CREATE INDEX IF NOT EXISTS idx_crm_stages_board_order ON public.crm_stages(board_id, order_index);

-- Função para criar board com stages padrão
CREATE OR REPLACE FUNCTION public.create_default_board(p_workspace_id UUID, p_board_name TEXT)
RETURNS UUID AS $$
DECLARE
  new_board_id UUID;
  max_order INT;
BEGIN
  -- Obter próximo order_index
  SELECT COALESCE(MAX(order_index), 0) + 1 
  INTO max_order
  FROM public.crm_boards 
  WHERE workspace_id = p_workspace_id;
  
  -- Criar board
  INSERT INTO public.crm_boards (workspace_id, name, is_default, order_index)
  VALUES (p_workspace_id, p_board_name, false, max_order)
  RETURNING id INTO new_board_id;
  
  -- Criar stages padrão
  INSERT INTO public.crm_stages (board_id, workspace_id, name, color, order_index) VALUES
    (new_board_id, p_workspace_id, 'Novo Lead', '#3b82f6', 1),
    (new_board_id, p_workspace_id, 'Em Contato', '#f59e0b', 2),
    (new_board_id, p_workspace_id, 'Qualificado', '#10b981', 3),
    (new_board_id, p_workspace_id, 'Concluído', '#6366f1', 4);
  
  RETURN new_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;