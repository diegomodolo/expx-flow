-- Adicionar campo leader_id na tabela teams
ALTER TABLE public.teams
ADD COLUMN leader_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_teams_leader ON public.teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_whatsapp_responsible ON public.teams(whatsapp_responsible_id);

-- Comentários para documentação
COMMENT ON COLUMN public.teams.leader_id IS 'Líder/gestor do squad';
COMMENT ON COLUMN public.teams.whatsapp_responsible_id IS 'Responsável pelo atendimento WhatsApp do squad';