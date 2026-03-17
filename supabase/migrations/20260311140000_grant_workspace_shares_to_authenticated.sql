-- Fix: workspace_shares retorna vazio por falta de GRANT
-- Sem GRANT, RLS policies existem mas o role authenticated nao tem permissao base na tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_documents TO authenticated;
