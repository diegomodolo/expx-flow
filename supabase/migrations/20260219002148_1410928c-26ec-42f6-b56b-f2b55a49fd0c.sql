ALTER TABLE public.ia_agents ADD COLUMN output_instructions TEXT DEFAULT '';


COMMENT ON COLUMN public.ia_agents.output_instructions IS 'Instruções de formatação de saída do agente - define como o agente deve estruturar suas respostas (ex: sempre incluir URLs de imagens geradas)';