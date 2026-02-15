
-- Squads de Agentes de IA
CREATE TABLE public.ia_agent_squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view squads in their company"
  ON public.ia_agent_squads FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can create squads in their company"
  ON public.ia_agent_squads FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update squads in their company"
  ON public.ia_agent_squads FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete squads in their company"
  ON public.ia_agent_squads FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()));

-- Membros da squad
CREATE TABLE public.ia_agent_squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.ia_agent_squads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ia_agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'executor' CHECK (role IN ('leader', 'manager', 'executor')),
  squad_instructions TEXT,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_squad_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view squad members"
  ON public.ia_agent_squad_members FOR SELECT
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage squad members"
  ON public.ia_agent_squad_members FOR INSERT
  WITH CHECK (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can update squad members"
  ON public.ia_agent_squad_members FOR UPDATE
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete squad members"
  ON public.ia_agent_squad_members FOR DELETE
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

-- Fluxos entre agentes
CREATE TABLE public.ia_agent_squad_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.ia_agent_squads(id) ON DELETE CASCADE,
  source_member_id UUID NOT NULL REFERENCES public.ia_agent_squad_members(id) ON DELETE CASCADE,
  target_member_id UUID NOT NULL REFERENCES public.ia_agent_squad_members(id) ON DELETE CASCADE,
  label TEXT,
  condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_squad_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view squad flows"
  ON public.ia_agent_squad_flows FOR SELECT
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage squad flows"
  ON public.ia_agent_squad_flows FOR INSERT
  WITH CHECK (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can update squad flows"
  ON public.ia_agent_squad_flows FOR UPDATE
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete squad flows"
  ON public.ia_agent_squad_flows FOR DELETE
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

-- Execuções da squad
CREATE TABLE public.ia_agent_squad_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.ia_agent_squads(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input TEXT,
  final_output TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_squad_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view squad executions"
  ON public.ia_agent_squad_executions FOR SELECT
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can create squad executions"
  ON public.ia_agent_squad_executions FOR INSERT
  WITH CHECK (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can update squad executions"
  ON public.ia_agent_squad_executions FOR UPDATE
  USING (squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid())));

-- Passos individuais de execução
CREATE TABLE public.ia_agent_squad_execution_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ia_agent_squad_executions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ia_agents(id),
  member_id UUID REFERENCES public.ia_agent_squad_members(id),
  step_order INT NOT NULL DEFAULT 0,
  input TEXT,
  output TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_squad_execution_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view execution steps"
  ON public.ia_agent_squad_execution_steps FOR SELECT
  USING (execution_id IN (SELECT id FROM public.ia_agent_squad_executions WHERE squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()))));

CREATE POLICY "Users can manage execution steps"
  ON public.ia_agent_squad_execution_steps FOR INSERT
  WITH CHECK (execution_id IN (SELECT id FROM public.ia_agent_squad_executions WHERE squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()))));

CREATE POLICY "Users can update execution steps"
  ON public.ia_agent_squad_execution_steps FOR UPDATE
  USING (execution_id IN (SELECT id FROM public.ia_agent_squad_executions WHERE squad_id IN (SELECT id FROM public.ia_agent_squads WHERE company_id IN (SELECT company_id FROM public.employees WHERE user_id = auth.uid()))));

-- Trigger para updated_at
CREATE TRIGGER update_ia_agent_squads_updated_at
  BEFORE UPDATE ON public.ia_agent_squads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
